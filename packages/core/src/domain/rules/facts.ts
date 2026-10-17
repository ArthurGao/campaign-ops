import { AppError } from '../errors';
import type { FactEntry, FactView } from '../types';

const DAY_MS = 86_400_000;
/** A confirmed-with-expiry entry is "nearing" (amber chip) within this many days of expiry. */
export const EXPIRY_WARNING_DAYS = 45;

export function isPubliclyUsable(entry: FactEntry, now: Date): boolean {
  if (entry.page !== 'external') return false;
  if (entry.status === 'confirmed') return true;
  return entry.status === 'confirmed_with_expiry' && !!entry.expiresAt && new Date(entry.expiresAt) > now;
}

export function isExpiringSoon(entry: FactEntry, now: Date): boolean {
  if (entry.status !== 'confirmed_with_expiry' || !entry.expiresAt) return false;
  const left = new Date(entry.expiresAt).getTime() - now.getTime();
  return left > 0 && left <= EXPIRY_WARNING_DAYS * DAY_MS;
}

export function toView(entry: FactEntry, now: Date): FactView {
  return { ...entry, publiclyUsable: isPubliclyUsable(entry, now), expiringSoon: isExpiringSoon(entry, now) };
}

/** Fact refs that block public use: unknown ids, internal entries, or not (or no longer) confirmed. */
export function unusableRefs(factRefs: readonly string[], facts: readonly FactEntry[], now: Date): string[] {
  const byId = new Map(facts.map((f) => [f.id, f]));
  return factRefs.filter((id) => {
    const entry = byId.get(id);
    return !entry || !isPubliclyUsable(entry, now);
  });
}

export function needsConfirmation(factRefs: readonly string[], facts: readonly FactEntry[], now: Date): boolean {
  return unusableRefs(factRefs, facts, now).length > 0;
}

/** I-F1: the only view the Outbound agent may read. */
export function externalOnly(facts: readonly FactEntry[]): FactEntry[] {
  return facts.filter((f) => f.page === 'external');
}

/** 'FS-v1.3' → 'FS-v1.4'. */
export function bumpFactSheetVersion(version: string): string {
  const m = /^FS-v(\d+)\.(\d+)$/.exec(version);
  if (!m) throw new Error(`Unrecognised Fact Sheet version: ${version}`);
  return `FS-v${m[1]}.${Number(m[2]) + 1}`;
}

export function assertConfirmable(entry: FactEntry, source: string | undefined): void {
  if (!source || !source.trim()) {
    throw new AppError(
      'VALIDATION',
      `Cannot confirm ${entry.id} without a source.`,
      'Add the document name or URL the client confirmed it from.',
    );
  }
  if (entry.status === 'superseded') {
    throw new AppError(
      'INVALID_TRANSITION',
      `${entry.id} is superseded by ${entry.supersededBy ?? 'a newer entry'}.`,
      'Confirm the entry that replaced it instead.',
    );
  }
}

export function needsConfirmationError(ids: string[], what: string): AppError {
  return new AppError(
    'NEEDS_CONFIRMATION',
    `${what} references unconfirmed facts: ${ids.join(', ')}.`,
    `The client must confirm ${ids.join(', ')} on the Fact Sheet first.`,
  );
}
