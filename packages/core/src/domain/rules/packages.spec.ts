import {
  APPROVER,
  EXECUTOR,
  PM,
  SEED_NOW,
  expectCode,
  find,
  freshSeed,
} from '../../testing/fixtures';
import {
  applyPackageEdit,
  approvePackage,
  markPublished,
  publishKey,
  recordVerification,
  rejectPackage,
  schedulePackage,
  takeDown,
  type PackageContext,
} from './packages';

describe('package rules', () => {
  let seed: ReturnType<typeof freshSeed>;
  let ctx: PackageContext;
  const pkg = (id: string) => ({ ...find(seed.packages, id) });

  beforeEach(() => {
    seed = freshSeed();
    ctx = { now: SEED_NOW, facts: seed.facts, settings: seed.settings };
  });

  describe('approve (I-P1)', () => {
    it('records the exact asset and caption versions approved', () => {
      const next = approvePackage(pkg('PUB-2027CT-012'), APPROVER, ctx);
      expect(next.status).toBe('approved');
      expect(next.approval).toMatchObject({
        approvedAssetVersion: 'v2',
        approvedCaptionVersion: 'CAP-012-v1',
        approver: APPROVER,
      });
    });

    it('403 for the executor; 403 for the PM without the non-substantive flow', () => {
      expectCode(() => approvePackage(pkg('PUB-2027CT-012'), EXECUTOR, ctx), 'FORBIDDEN');
      expectCode(() => approvePackage(pkg('PUB-2027CT-012'), PM, ctx), 'FORBIDDEN');
    });

    it('NEEDS_CONFIRMATION when a fact ref is unconfirmed (rule 4)', () => {
      const p = { ...pkg('PUB-2027CT-012'), factRefs: ['FS-07', 'FS-04'] };
      expectCode(() => approvePackage(p, APPROVER, ctx), 'NEEDS_CONFIRMATION');
    });

    it('INVALID_TRANSITION when not awaiting approval', () => {
      expectCode(() => approvePackage(pkg('PUB-2027CT-010'), APPROVER, ctx), 'INVALID_TRANSITION');
    });

    it('rejection needs a note and keeps the package awaiting approval', () => {
      expectCode(() => rejectPackage(pkg('PUB-2027CT-012'), APPROVER, '', SEED_NOW), 'VALIDATION');
      const next = rejectPackage(
        pkg('PUB-2027CT-012'),
        APPROVER,
        'Mention the guide first',
        SEED_NOW,
      );
      expect(next).toMatchObject({
        status: 'awaiting_approval',
        approval: { status: 'rejected', note: 'Mention the guide first' },
      });
    });
  });

  describe('edit after approval (I-P3, F4)', () => {
    it('bumps the caption version, keeps history and resets approval', () => {
      const next = applyPackageEdit(
        pkg('PUB-2027CT-011'),
        { captionText: 'Four cities in 30 seconds. Link in bio.' },
        PM,
        ctx,
      );
      expect(next.caption.version).toBe('CAP-011-v2');
      expect(next.captionHistory.map((c) => c.version)).toEqual(['CAP-011-v1', 'CAP-011-v2']);
      expect(next).toMatchObject({ status: 'awaiting_approval', approval: { status: 'pending' } });
    });

    it('bumps the asset version from the new asset id', () => {
      const next = applyPackageEdit(
        pkg('PUB-2027CT-012'),
        {
          asset: {
            assetId: 'VID-0031-4x5-v3',
            url: 'https://factory.example/a.mp4',
            checksum: 'sha256:x',
          },
        },
        PM,
        ctx,
      );
      expect(next.asset?.version).toBe('v3');
      expect(next.assetHistory).toHaveLength(2);
    });

    it('non-substantive: PM may approve the new version within scope, recording the authorisation', () => {
      const edited = applyPackageEdit(
        pkg('PUB-2027CT-011'),
        {
          captionText: 'Four cities in 30 seconds! Which one would you visit first? Link in bio.',
          nonSubstantive: { scopeRef: 'punctuation' },
        },
        PM,
        ctx,
      );
      const approved = approvePackage(edited, PM, ctx);
      expect(approved.approval).toMatchObject({
        approvedCaptionVersion: 'CAP-011-v2',
        nonSubstantive: { scopeRef: 'punctuation', authorisedBy: 'Morgan Hale' },
      });
    });

    it('SCOPE_NOT_AUTHORISED when the PM is not allowed to approve edits', () => {
      seed.settings.preApprovedScope.pmMayApproveNonSubstantive = false;
      expectCode(
        () =>
          applyPackageEdit(
            pkg('PUB-2027CT-011'),
            { captionText: 'x', nonSubstantive: { scopeRef: 'typos' } },
            PM,
            ctx,
          ),
        'SCOPE_NOT_AUTHORISED',
      );
    });

    it('scheduledAt edits do not reset approval (D-25)', () => {
      const next = applyPackageEdit(
        pkg('PUB-2027CT-011'),
        { scheduledAt: '2026-10-20T00:00:00.000Z' },
        PM,
        ctx,
      );
      expect(next).toMatchObject({ status: 'approved', approval: { status: 'approved' } });
    });

    it('published packages cannot be edited', () => {
      expectCode(
        () => applyPackageEdit(pkg('PUB-2027CT-009'), { captionText: 'x' }, PM, ctx),
        'INVALID_TRANSITION',
      );
    });
  });

  describe('schedule (I-P2)', () => {
    it('APPROVAL_REQUIRED when not approved', () => {
      expectCode(
        () => schedulePackage(pkg('PUB-2027CT-012'), EXECUTOR, seed.packages, ctx),
        'APPROVAL_REQUIRED',
      );
    });

    it('VERSION_MISMATCH when the approved versions differ from the current ones', () => {
      const p = { ...pkg('PUB-2027CT-011'), caption: { version: 'CAP-011-v2', text: 'x' } };
      const err = expectCode(
        () => schedulePackage(p, EXECUTOR, seed.packages, ctx),
        'VERSION_MISMATCH',
      );
      expect(err.hint).toBe(
        'Approved: asset v1 / caption CAP-011-v1 — current: asset v1 / caption CAP-011-v2.',
      );
    });

    it('DUPLICATE_PUBLISH when the same asset was already published on the same channel', () => {
      const err = expectCode(
        () => schedulePackage(pkg('PUB-2027CT-011'), EXECUTOR, seed.packages, ctx),
        'DUPLICATE_PUBLISH',
      );
      expect(err.message).toContain('PUB-2027CT-007');
    });

    it('schedules an approved package with a fresh asset and logs it', () => {
      const p = {
        ...pkg('PUB-2027CT-011'),
        asset: { ...pkg('PUB-2027CT-011').asset!, assetId: 'VID-0031-9x16-v1' },
      };
      const next = schedulePackage(p, EXECUTOR, seed.packages, ctx);
      expect(next.status).toBe('scheduled');
      expect(next.publishLog.at(-1)).toMatchObject({ action: 'scheduled', actor: EXECUTOR });
    });

    it('403 for the PM', () => {
      expectCode(() => schedulePackage(pkg('PUB-2027CT-011'), PM, seed.packages, ctx), 'FORBIDDEN');
    });

    it('keys text-only packages by task and channel', () => {
      const p = { ...pkg('PUB-2027CT-011'), asset: undefined };
      expect(publishKey(p)).toBe('TASK-025|instagram_reels');
    });
  });

  describe('publish, verify, take down (I-P4)', () => {
    it('publish requires scheduled and a post URL', () => {
      expectCode(
        () =>
          markPublished(
            pkg('PUB-2027CT-011'),
            EXECUTOR,
            'https://x.example/p',
            SEED_NOW.toISOString(),
          ),
        'INVALID_TRANSITION',
      );
      expectCode(
        () => markPublished(pkg('PUB-2027CT-010'), EXECUTOR, ' ', SEED_NOW.toISOString()),
        'VALIDATION',
      );
      const next = markPublished(
        pkg('PUB-2027CT-010'),
        EXECUTOR,
        'https://youtube.example/v/1',
        SEED_NOW.toISOString(),
      );
      expect(next.publishLog.at(-1)).toMatchObject({
        action: 'published',
        postUrl: 'https://youtube.example/v/1',
      });
    });

    it('verification requires a published entry; mismatch requires a note', () => {
      expectCode(
        () => recordVerification(pkg('PUB-2027CT-010'), PM, 'verified', undefined, SEED_NOW),
        'INVALID_TRANSITION',
      );
      expectCode(
        () => recordVerification(pkg('PUB-2027CT-009'), PM, 'mismatch', '', SEED_NOW),
        'VALIDATION',
      );
      expect(
        recordVerification(pkg('PUB-2027CT-009'), PM, 'verified', undefined, SEED_NOW).status,
      ).toBe('verified');
    });

    it('take-down needs a published post and a note, and flags the package', () => {
      expectCode(() => takeDown(pkg('PUB-2027CT-010'), PM, 'x', SEED_NOW), 'INVALID_TRANSITION');
      const next = takeDown(pkg('PUB-2027CT-008'), PM, 'Unapproved sentence live', SEED_NOW);
      expect(next).toMatchObject({ takenDown: true, status: 'mismatch' });
      expect(next.publishLog.at(-1)?.action).toBe('taken_down');
    });
  });
});

describe('post URLs are http(s) only', () => {
  it('refuses a javascript: post URL', () => {
    const seed = freshSeed();
    expectCode(
      () =>
        markPublished(
          { ...find(seed.packages, 'PUB-2027CT-010') },
          EXECUTOR,
          'javascript:alert(1)',
          SEED_NOW.toISOString(),
        ),
      'VALIDATION',
    );
  });
});
