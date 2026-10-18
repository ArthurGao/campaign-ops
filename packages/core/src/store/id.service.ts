import { type MemoryStore } from './memory.store';

/** Human-readable ids with the plan's prefixes and zero-padding; never UUIDs. */
export class IdService {
  constructor(private readonly store: MemoryStore) {}

  private ids<T extends { id: string }>(items: T[]): string[] {
    return items.map((i) => i.id);
  }

  fact(): string {
    return this.store.nextId('FS-', 2, this.ids(this.store.data.facts));
  }
  evidence(): string {
    return this.store.nextId('E-', 2, this.ids(this.store.data.evidence));
  }
  task(): string {
    return this.store.nextId('TASK-', 3, this.ids(this.store.data.tasks));
  }
  run(): string {
    return this.store.nextId('RUN-', 4, this.ids(this.store.data.runs));
  }
  brief(): string {
    return this.store.nextId('SOC-2027CT-', 3, this.ids(this.store.data.briefs));
  }
  package(): string {
    return this.store.nextId('PUB-2027CT-', 3, this.ids(this.store.data.packages));
  }
  lead(): string {
    return this.store.nextId('L-', 4, this.ids(this.store.data.leads));
  }
  /** 'PUB-2027CT-013' → 'CAP-013-v1'. */
  caption(packageId: string): string {
    return `CAP-${packageId.slice(-3)}-v1`;
  }
}
