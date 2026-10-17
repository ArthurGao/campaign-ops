import type { Seed } from '../seed';
import { buildSeed } from '../seed';

/**
 * Typed in-memory collections. Services read and write these directly; `reset` swaps in a deep
 * copy of the seed so the demo can be replayed.
 */
export class MemoryStore {
  data: Seed;

  constructor() {
    this.data = structuredClone(buildSeed());
  }

  reset(seed: Seed = buildSeed()): void {
    this.data = structuredClone(seed);
  }

  /** Next human-readable id for a prefix, e.g. next('TASK-', 3) → 'TASK-034'. */
  nextId(prefix: string, width: number, existing: Iterable<string>): string {
    let max = 0;
    for (const id of existing) {
      if (!id.startsWith(prefix)) continue;
      const n = Number(id.slice(prefix.length).match(/^\d+/)?.[0] ?? NaN);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return `${prefix}${String(max + 1).padStart(width, '0')}`;
  }
}
