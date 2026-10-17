import {
  APPROVER,
  DECIDER,
  EXECUTOR,
  PM,
  SALES,
  SEED_NOW,
  expectCode,
  find,
  freshSeed,
} from '../../testing/fixtures';
import type { AdGates, Task } from '../types';
import { computeAdGates } from './gates';
import { applyEdit, applyTransition, blockTask, pageLockConflict, type TaskContext } from './tasks';

const PASSING_QA = { passed: true, checklist: [{ item: 'Spec', ok: true }] };

describe('task rules', () => {
  let seed: ReturnType<typeof freshSeed>;
  let ctx: TaskContext;
  const task = (id: string) => find(seed.tasks, id);
  const draftTask = (): Task => ({ ...task('TASK-019') });

  beforeEach(() => {
    seed = freshSeed();
    ctx = { now: SEED_NOW, facts: seed.facts, settings: seed.settings, tasks: seed.tasks };
  });

  describe('draft → qa', () => {
    it('moves a draft with usable facts to qa (pm)', () => {
      expect(applyTransition(draftTask(), { to: 'qa', actor: PM }, ctx).status).toBe('qa');
    });

    it('403 for non-pm', () => {
      expectCode(() => applyTransition(draftTask(), { to: 'qa', actor: SALES }, ctx), 'FORBIDDEN');
    });

    it('NEEDS_CONFIRMATION when a fact ref is not publicly usable', () => {
      const t = { ...draftTask(), factRefs: ['FS-07', 'FS-15'] };
      const err = expectCode(() => applyTransition(t, { to: 'qa', actor: PM }, ctx), 'NEEDS_CONFIRMATION');
      expect(err.message).toContain('FS-15');
    });
  });

  describe('qa → awaiting_approval', () => {
    const inQa = () => ({ ...task('TASK-022'), body: 'Clean caption [← FS-07]' });

    it('records the submitted QA and moves on when every item passes', () => {
      const next = applyTransition(inQa(), { to: 'awaiting_approval', actor: PM, qa: PASSING_QA }, ctx);
      expect(next.status).toBe('awaiting_approval');
      expect(next.qa).toMatchObject({ passed: true, by: PM, at: SEED_NOW.toISOString() });
    });

    it('QA_REQUIRED without a QA record', () => {
      expectCode(() => applyTransition(inQa(), { to: 'awaiting_approval', actor: PM }, ctx), 'QA_REQUIRED');
    });

    it('QA_REQUIRED when a checklist item is unticked, naming it', () => {
      const qa = { passed: true, checklist: [{ item: 'No prohibited words', ok: false }] };
      const err = expectCode(() => applyTransition(inQa(), { to: 'awaiting_approval', actor: PM, qa }, ctx), 'QA_REQUIRED');
      expect(err.hint).toContain('No prohibited words');
    });
  });

  describe('awaiting_approval → approved / draft', () => {
    it('client approver approves and binds approvedVersion to the current version', () => {
      const next = applyTransition(task('TASK-018'), { to: 'approved', actor: APPROVER }, ctx);
      expect(next.status).toBe('approved');
      expect(next.approval).toMatchObject({ status: 'approved', approvedVersion: 2, approver: APPROVER });
    });

    it('403 for the PM without a pending non-substantive edit', () => {
      const err = expectCode(() => applyTransition(task('TASK-018'), { to: 'approved', actor: PM }, ctx), 'FORBIDDEN');
      expect(err.hint).toBe('Requires: client_approver or client_decision_maker');
    });

    it('ad_change needs the decision maker, not the approver', () => {
      expectCode(() => applyTransition(task('TASK-033'), { to: 'approved', actor: APPROVER }, ctx), 'FORBIDDEN');
      expect(applyTransition(task('TASK-033'), { to: 'approved', actor: DECIDER }, ctx).status).toBe('approved');
    });

    it('NEEDS_CONFIRMATION when a referenced fact became unusable', () => {
      const t = { ...task('TASK-018'), factRefs: ['FS-07', 'FS-04'] };
      expectCode(() => applyTransition(t, { to: 'approved', actor: APPROVER }, ctx), 'NEEDS_CONFIRMATION');
    });

    it('rejection returns to draft with the note and clears QA', () => {
      const next = applyTransition(task('TASK-018'), { to: 'draft', actor: APPROVER, note: 'Show the register link higher' }, ctx);
      expect(next).toMatchObject({ status: 'draft', qa: undefined, approval: { status: 'rejected', note: 'Show the register link higher' } });
    });

    it('rejection without a note is refused', () => {
      expectCode(() => applyTransition(task('TASK-018'), { to: 'draft', actor: APPROVER }, ctx), 'VALIDATION');
    });
  });

  describe('non-substantive flow (D-19)', () => {
    it('edit bumps the version and resets approval, then the PM may approve within scope', () => {
      const edited = applyEdit(task('TASK-030'), { body: 'Headline 1: Guided China Tour 2027.', nonSubstantive: { scopeRef: 'punctuation' } }, PM, ctx);
      expect(edited).toMatchObject({ version: 2, status: 'awaiting_approval', approval: undefined, pendingNonSubstantive: { scopeRef: 'punctuation' } });
      const approved = applyTransition(edited, { to: 'approved', actor: PM }, ctx);
      expect(approved.approval).toMatchObject({
        approvedVersion: 2,
        nonSubstantive: { scopeRef: 'punctuation', authorisedBy: 'Morgan Hale' },
      });
    });

    it('SCOPE_NOT_AUTHORISED when the scope does not list the edit kind', () => {
      expectCode(() => applyEdit(task('TASK-030'), { body: 'x', nonSubstantive: { scopeRef: 'new claims' } }, PM, ctx), 'SCOPE_NOT_AUTHORISED');
    });

    it('SCOPE_NOT_AUTHORISED at approval when the client switched PM approvals off after the edit', () => {
      const edited = applyEdit(task('TASK-030'), { body: 'x', nonSubstantive: { scopeRef: 'typos' } }, PM, ctx);
      seed.settings.preApprovedScope.pmMayApproveNonSubstantive = false;
      expectCode(() => applyTransition(edited, { to: 'approved', actor: PM }, ctx), 'SCOPE_NOT_AUTHORISED');
    });

    it('a normal edit on an approved task resets it with no pending mark', () => {
      const edited = applyEdit(task('TASK-030'), { body: 'New copy [← FS-07]' }, PM, ctx);
      expect(edited).toMatchObject({ version: 2, status: 'awaiting_approval', approval: undefined, pendingNonSubstantive: undefined });
    });
  });

  describe('approved → live', () => {
    const gatesFor = (t: Task) => computeAdGates(t, ctx);

    it('403 for anyone but the executor', () => {
      expectCode(() => applyTransition(task('TASK-011'), { to: 'live', actor: PM }, ctx), 'FORBIDDEN');
    });

    it('APPROVAL_REQUIRED when the approval is for an older version', () => {
      const t = { ...task('TASK-011'), version: 2 };
      expectCode(() => applyTransition(t, { to: 'live', actor: EXECUTOR }, ctx), 'APPROVAL_REQUIRED');
    });

    it('AD_GATES_UNMET with the gates in the payload while the landing page is not ready (F5)', () => {
      const t = task('TASK-030');
      const err = expectCode(() => applyTransition(t, { to: 'live', actor: EXECUTOR }, { ...ctx, gates: gatesFor(t) }), 'AD_GATES_UNMET');
      expect(err.extra.gates).toEqual<AdGates>({
        productFactsConfirmed: true,
        landingPageReady: false,
        creativeApproved: true,
        budgetAndMonitoringApproved: true,
      });
      expect(err.hint).toBe('Unmet: Landing page traffic-ready');
    });

    it('goes live once all four gates pass', () => {
      seed.settings.landingPage.status = 'traffic_ready';
      const t = task('TASK-030');
      expect(applyTransition(t, { to: 'live', actor: EXECUTOR }, { ...ctx, gates: gatesFor(t) }).status).toBe('live');
    });

    it('PAGE_LOCKED while another change on the same page is live', () => {
      const t = { ...task('TASK-018'), status: 'approved' as const, approval: { approver: APPROVER, at: '', status: 'approved' as const, approvedVersion: 2 } };
      expect(pageLockConflict(t, seed.tasks)?.id).toBe('TASK-016');
      const err = expectCode(() => applyTransition(t, { to: 'live', actor: EXECUTOR }, ctx), 'PAGE_LOCKED');
      expect(err.hint).toContain('TASK-016');
    });

    it('page lock clears once the live change is verified', () => {
      find(seed.tasks, 'TASK-016').status = 'verified';
      const t = { ...task('TASK-018'), status: 'approved' as const, approval: { approver: APPROVER, at: '', status: 'approved' as const, approvedVersion: 2 } };
      expect(applyTransition(t, { to: 'live', actor: EXECUTOR }, ctx).status).toBe('live');
    });
  });

  describe('live → verified', () => {
    it('requires an accepted matching verification', () => {
      expectCode(() => applyTransition(task('TASK-016'), { to: 'verified', actor: PM }, ctx), 'INVALID_TRANSITION');
      const verified = { ...task('TASK-016'), verification: { result: 'match' as const, runId: 'R', outputId: 'O', at: '', by: PM } };
      expect(applyTransition(verified, { to: 'verified', actor: PM }, ctx).status).toBe('verified');
    });
  });

  describe('blocked', () => {
    it('blocked → draft refused while the blocking fact is still pending', () => {
      expectCode(() => applyTransition(task('TASK-021'), { to: 'draft', actor: PM }, ctx), 'NEEDS_CONFIRMATION');
    });

    it('blocked → draft allowed once FS-04 is confirmed', () => {
      Object.assign(find(seed.facts, 'FS-04'), { status: 'confirmed', source: 'Client email' });
      const next = applyTransition(task('TASK-021'), { to: 'draft', actor: PM }, ctx);
      expect(next).toMatchObject({ status: 'draft', blockedReason: undefined, needsConfirmation: false });
    });

    it('nobody can request → blocked; only the system blocks', () => {
      expectCode(() => applyTransition(draftTask(), { to: 'blocked', actor: PM }, ctx), 'INVALID_TRANSITION');
      expect(blockTask(draftTask(), 'needs_confirmation: FS-15')).toMatchObject({ status: 'blocked', blockedReason: 'needs_confirmation: FS-15' });
    });
  });

  it('INVALID_TRANSITION for any transition not in the table, naming the next step', () => {
    const err = expectCode(() => applyTransition(draftTask(), { to: 'approved', actor: APPROVER }, ctx), 'INVALID_TRANSITION');
    expect(err.hint).toBe('From draft the next step is qa.');
    expectCode(() => applyTransition(task('TASK-014'), { to: 'live', actor: EXECUTOR }, ctx), 'INVALID_TRANSITION');
  });

  describe('edits', () => {
    it('live work is frozen', () => {
      expectCode(() => applyEdit(task('TASK-016'), { body: 'changed' }, PM, ctx), 'INVALID_TRANSITION');
    });

    it('editing in QA clears the QA record and recomputes needsConfirmation', () => {
      const t = { ...task('TASK-022'), qa: { by: PM, at: '', passed: true, checklist: [] } };
      const next = applyEdit(t, { factRefs: ['FS-07', 'FS-15'] }, PM, ctx);
      expect(next).toMatchObject({ qa: undefined, needsConfirmation: true, version: 1, status: 'qa' });
    });
  });
});
