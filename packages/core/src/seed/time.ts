import { SEED_NOW } from '../domain/clock';
import type { AuditEvent, Actor, Tracked } from '../domain/types';

const DAY_MS = 86_400_000;

/**
 * ISO instant `days` from SEED_NOW at a Pacific/Auckland wall time.
 * The whole seed window (Sep 2026 – Mar 2027) is inside NZ daylight time (UTC+13).
 */
export function at(days: number, time = '10:00'): string {
  const [h, m] = time.split(':').map(Number);
  const offsetMs = days * DAY_MS + ((h - 10) * 60 + m) * 60_000;
  return new Date(SEED_NOW.getTime() + offsetMs).toISOString();
}

export function ev(when: string, actor: Actor, action: string, detail?: string, reason?: string): AuditEvent {
  return { at: when, actor, action, ...(detail ? { detail } : {}), ...(reason ? { reason } : {}) };
}

/** Timestamps + history for a seed record; updatedAt is the last event. */
export function tracked(createdAt: string, events: AuditEvent[]): Tracked {
  const last = events.length ? events[events.length - 1].at : createdAt;
  return { createdAt, updatedAt: last, events };
}
