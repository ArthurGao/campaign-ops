import type { Actor, Tracked } from '../domain/types';

/** Append an audit event and bump updatedAt (backend rule 6: every mutation is recorded). */
export function stamp<T extends Tracked>(
  entity: T,
  now: Date,
  actor: Actor,
  action: string,
  detail?: string,
  reason?: string,
): T {
  const at = now.toISOString();
  return {
    ...entity,
    updatedAt: at,
    events: [
      ...entity.events,
      { at, actor, action, ...(detail ? { detail } : {}), ...(reason ? { reason } : {}) },
    ],
  };
}

/** Replace an item by id inside a collection (store arrays keep their order). */
export function replaceById<T extends { id: string }>(items: T[], next: T): T {
  const i = items.findIndex((x) => x.id === next.id);
  if (i < 0) throw new Error(`replaceById: ${next.id} not in collection`);
  items[i] = next;
  return next;
}
