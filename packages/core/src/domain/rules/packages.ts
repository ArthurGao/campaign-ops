import { CLIENT_ROLES, type Role } from '../enums';
import { AppError, forbidden, invalidTransition } from '../errors';
import type { Actor, FactEntry, PackageAsset, PublishPackage, Settings } from '../types';
import { needsConfirmationError, unusableRefs } from './facts';
import { scopeAllows, scopeNotAuthorised } from './tasks';
import { assetVersion, bumpVersionLabel } from './versions';

export type PackageContext = { now: Date; facts: readonly FactEntry[]; settings: Settings };

function requireRole(actor: Actor, roles: readonly Role[], action: string): void {
  if (!roles.includes(actor.role)) throw forbidden(action, roles);
}

function requireUsableFacts(pkg: PublishPackage, ctx: PackageContext): void {
  const missing = unusableRefs(pkg.factRefs, ctx.facts, ctx.now);
  if (missing.length) throw needsConfirmationError(missing, pkg.id);
}

/** I-P2 duplicate key: same asset on the same channel (text-only packages: same task, D-24). */
export function publishKey(pkg: PublishPackage): string {
  return `${pkg.asset?.assetId ?? pkg.sourceTaskId}|${pkg.channel}`;
}

export function hasPublished(pkg: PublishPackage): boolean {
  return pkg.publishLog.some((e) => e.action === 'published');
}

/** I-P1: approval binds the exact asset and caption versions. */
export function versionsMatchApproval(pkg: PublishPackage): boolean {
  const a = pkg.approval;
  return (
    a.status === 'approved' &&
    a.approvedCaptionVersion === pkg.caption.version &&
    a.approvedAssetVersion === pkg.asset?.version
  );
}

export function approvePackage(pkg: PublishPackage, actor: Actor, ctx: PackageContext, note?: string): PublishPackage {
  if (pkg.status !== 'awaiting_approval') {
    throw invalidTransition(pkg.status, 'approved', 'Only packages awaiting approval can be approved.');
  }
  let nonSubstantive: PublishPackage['approval']['nonSubstantive'];
  if (actor.role === 'pm') {
    const pending = pkg.pendingNonSubstantive;
    if (!pending) throw forbidden('approve this package', CLIENT_ROLES);
    if (!scopeAllows(ctx.settings, pending.scopeRef)) throw scopeNotAuthorised(pending.scopeRef);
    nonSubstantive = { authorisedBy: ctx.settings.preApprovedScope.signedBy, scopeRef: pending.scopeRef };
  } else {
    requireRole(actor, CLIENT_ROLES, 'approve this package');
  }
  requireUsableFacts(pkg, ctx);
  if (!pkg.qa.passed) throw new AppError('QA_REQUIRED', `${pkg.id} has not passed QA.`, 'Record QA on the source task first.');
  return {
    ...pkg,
    status: 'approved',
    needsRereview: false,
    pendingNonSubstantive: undefined,
    approval: {
      approver: actor,
      status: 'approved',
      at: ctx.now.toISOString(),
      approvedAssetVersion: pkg.asset?.version,
      approvedCaptionVersion: pkg.caption.version,
      ...(note ? { note } : {}),
      ...(nonSubstantive ? { nonSubstantive } : {}),
    },
  };
}

export function rejectPackage(pkg: PublishPackage, actor: Actor, note: string | undefined, now: Date): PublishPackage {
  requireRole(actor, CLIENT_ROLES, 'reject this package');
  if (pkg.status !== 'awaiting_approval') throw invalidTransition(pkg.status, 'rejected', 'Only packages awaiting approval can be rejected.');
  if (!note?.trim()) throw new AppError('VALIDATION', 'A rejection needs a note.', 'Say what must change before it comes back.');
  return { ...pkg, approval: { approver: actor, status: 'rejected', at: now.toISOString(), note } };
}

export function schedulePackage(pkg: PublishPackage, actor: Actor, all: readonly PublishPackage[], ctx: PackageContext): PublishPackage {
  requireRole(actor, ['executor'], 'schedule a package');
  if (pkg.status !== 'approved') {
    throw new AppError('APPROVAL_REQUIRED', `${pkg.id} is ${pkg.status.replace('_', ' ')}, not approved.`, 'The client approver must approve this version first.');
  }
  if (!versionsMatchApproval(pkg)) {
    throw new AppError(
      'VERSION_MISMATCH',
      `${pkg.id} changed after approval.`,
      `Approved: asset ${pkg.approval.approvedAssetVersion ?? '—'} / caption ${pkg.approval.approvedCaptionVersion} — current: asset ${pkg.asset?.version ?? '—'} / caption ${pkg.caption.version}.`,
    );
  }
  requireUsableFacts(pkg, ctx);
  const key = publishKey(pkg);
  const dup = all.find((p) => p.id !== pkg.id && publishKey(p) === key && hasPublished(p));
  if (dup) {
    throw new AppError(
      'DUPLICATE_PUBLISH',
      `${pkg.asset?.assetId ?? pkg.sourceTaskId} was already published on ${pkg.channel} by ${dup.id}.`,
      'Use a different asset or channel, or take the earlier post down first.',
    );
  }
  return {
    ...pkg,
    status: 'scheduled',
    publishLog: [...pkg.publishLog, { at: ctx.now.toISOString(), actor, action: 'scheduled' }],
  };
}

export function markPublished(pkg: PublishPackage, actor: Actor, postUrl: string, at: string): PublishPackage {
  requireRole(actor, ['executor'], 'mark a package published');
  if (pkg.status !== 'scheduled') throw invalidTransition(pkg.status, 'published', 'Schedule the package first.');
  if (!postUrl.trim()) throw new AppError('VALIDATION', 'A post URL is required.', 'Paste the live post link.');
  return { ...pkg, status: 'published', publishLog: [...pkg.publishLog, { at, actor, action: 'published', postUrl }] };
}

/** I-P4: verified / mismatch require a published entry; mismatch requires a note. */
export function recordVerification(
  pkg: PublishPackage,
  actor: Actor,
  result: 'verified' | 'mismatch',
  note: string | undefined,
  now: Date,
): PublishPackage {
  requireRole(actor, ['pm'], 'record a verification');
  if (!hasPublished(pkg)) {
    throw new AppError('INVALID_TRANSITION', `${pkg.id} has not been published.`, 'Verification compares the live post with the approved version.');
  }
  if (result === 'mismatch' && !note?.trim()) {
    throw new AppError('VALIDATION', 'A mismatch needs a note describing the difference.', 'Paste the diff between live and approved.');
  }
  return {
    ...pkg,
    status: result,
    verificationNote: note,
    publishLog: [...pkg.publishLog, { at: now.toISOString(), actor, action: result, ...(note ? { note } : {}) }],
  };
}

export function takeDown(pkg: PublishPackage, actor: Actor, note: string | undefined, now: Date): PublishPackage {
  requireRole(actor, ['pm'], 'take a post down');
  if (!hasPublished(pkg)) throw new AppError('INVALID_TRANSITION', `${pkg.id} is not live.`, 'Only published posts can be taken down.');
  if (pkg.takenDown) throw new AppError('INVALID_TRANSITION', `${pkg.id} is already taken down.`);
  if (!note?.trim()) throw new AppError('VALIDATION', 'Taking a post down needs a note.', 'Record why.');
  return { ...pkg, takenDown: true, publishLog: [...pkg.publishLog, { at: now.toISOString(), actor, action: 'taken_down', note }] };
}

export type PackageEdit = {
  captionText?: string;
  asset?: Omit<PackageAsset, 'version'> & { version?: string };
  scheduledAt?: string;
  nonSubstantive?: { scopeRef: string };
  needsRereview?: false;
};

/** I-P3: caption / asset edits bump that version and reset approval (non-substantive: D-19). */
export function applyPackageEdit(pkg: PublishPackage, edit: PackageEdit, actor: Actor, ctx: PackageContext): PublishPackage {
  requireRole(actor, ['pm'], 'edit a package');
  const at = ctx.now.toISOString();
  const captionChanged = edit.captionText !== undefined && edit.captionText !== pkg.caption.text;
  const assetChanged = edit.asset !== undefined && edit.asset.assetId !== pkg.asset?.assetId;
  const editable = pkg.status === 'awaiting_approval' || pkg.status === 'approved';

  if ((captionChanged || assetChanged || edit.scheduledAt !== undefined) && !editable) {
    throw new AppError(
      'INVALID_TRANSITION',
      `${pkg.id} is ${pkg.status}; it can no longer be edited.`,
      pkg.status === 'scheduled' ? 'Ask the executor to unschedule it first.' : 'Create a new package.',
    );
  }
  if (edit.nonSubstantive && !scopeAllows(ctx.settings, edit.nonSubstantive.scopeRef)) {
    throw scopeNotAuthorised(edit.nonSubstantive.scopeRef);
  }

  let next: PublishPackage = { ...pkg };
  if (captionChanged) {
    const caption = { version: bumpVersionLabel(pkg.caption.version), text: edit.captionText! };
    next = { ...next, caption, captionHistory: [...pkg.captionHistory, { ...caption, at }] };
  }
  if (assetChanged) {
    const version = edit.asset!.version ?? assetVersion(edit.asset!.assetId) ?? bumpVersionLabel(pkg.asset?.version ?? 'v0');
    const asset = { ...edit.asset!, version };
    next = { ...next, asset, assetHistory: [...pkg.assetHistory, { ...asset, at }] };
  }
  if (edit.scheduledAt !== undefined) next = { ...next, scheduledAt: edit.scheduledAt };
  if (edit.needsRereview === false) next = { ...next, needsRereview: false };

  if (captionChanged || assetChanged) {
    next = {
      ...next,
      status: 'awaiting_approval',
      approval: { status: 'pending' },
      pendingNonSubstantive: edit.nonSubstantive ? { scopeRef: edit.nonSubstantive.scopeRef, markedBy: actor, at } : undefined,
    };
  }
  return next;
}
