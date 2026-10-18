import type { EvidenceItem, Task } from '../types';

/**
 * A finding that blocks traffic, ads or measurement keeps blocking until it is dismissed or the
 * task it became is verified. The Dashboard, the sidebar badge and the weekly report all use this.
 */
export function stillBlocking(
  evidence: readonly EvidenceItem[],
  tasks: readonly Pick<Task, 'id' | 'status'>[],
): EvidenceItem[] {
  const verified = new Set(tasks.filter((t) => t.status === 'verified').map((t) => t.id));
  return evidence.filter(
    (e) =>
      e.blocks !== 'none' &&
      e.status !== 'dismissed' &&
      !(e.convertedTaskId && verified.has(e.convertedTaskId)),
  );
}
