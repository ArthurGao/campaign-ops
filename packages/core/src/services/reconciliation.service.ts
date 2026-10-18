import { funnelWeeks } from '../domain/rules/funnel';
import { summarize, withDerived } from '../domain/rules/recon';
import type { FunnelResponse, ReconResponse } from '../domain/types';
import type { MemoryStore } from '../store/memory.store';

export class ReconciliationService {
  constructor(private readonly store: MemoryStore) {}

  /** Last `weeks` weeks of platform-reported vs CRM valid leads, with derived CPL and ratio. */
  get(weeks = 3): ReconResponse {
    const starts = [...new Set(this.store.data.recon.map((r) => r.weekStart))]
      .sort()
      .slice(-Math.max(1, weeks));
    const rows = this.store.data.recon.filter((r) => starts.includes(r.weekStart)).map(withDerived);
    return { rows, summary: summarize(rows) };
  }

  /** Last `weeks` weeks by funnel layer, per channel and in total, with rates and break points. */
  funnel(weeks = 3): FunnelResponse {
    return { weeks: funnelWeeks(this.store.data.funnel, weeks) };
  }
}
