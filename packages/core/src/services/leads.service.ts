import { replaceById, stamp } from '../common/audit';
import { type IdService } from '../store/id.service';
import type { Clock } from '../domain/clock';
import type { SourceMedium, Stage, Validity } from '../domain/enums';
import { notFound } from '../domain/errors';
import {
  applyLeadPatch,
  deidentify,
  mergeLeads,
  mergeSuggestions,
  relatedLinks,
  toCsv,
} from '../domain/rules/leads';
import type { Actor, Lead, MergeSuggestion } from '../domain/types';
import { type MemoryStore } from '../store/memory.store';
import type { CreateLeadInput, PatchLeadInput } from './inputs';

export type LeadFilters = {
  validity?: Validity;
  stage?: Stage;
  medium?: SourceMedium;
  includeMerged?: boolean;
};

export class LeadsService {
  constructor(
    private readonly store: MemoryStore,
    private readonly ids: IdService,
    private readonly clock: Clock,
  ) {}

  private get leads(): Lead[] {
    return this.store.data.leads;
  }

  list(f: LeadFilters = {}): Lead[] {
    return this.leads
      .filter(
        (l) =>
          (f.includeMerged || !l.mergedInto) &&
          (!f.validity || l.validity.value === f.validity) &&
          (!f.stage || l.stage === f.stage) &&
          (!f.medium || l.source.utmMedium === f.medium),
      )
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }

  get(id: string): Lead {
    const l = this.leads.find((x) => x.id === id);
    if (!l) throw notFound('Lead', id);
    return l;
  }

  create(dto: CreateLeadInput, actor: Actor): Lead {
    const at = this.clock.now().toISOString();
    const lead: Lead = {
      id: this.ids.lead(),
      receivedAt: at,
      contact: { ...dto.contact },
      enquiry: { ...dto.enquiry },
      source: { ...dto.source },
      adDetail: { resolution: 'unknown' },
      clickIds: {},
      ...(dto.selfReportedSource ? { selfReportedSource: dto.selfReportedSource } : {}),
      owner: this.store.data.settings.people.sales[0] ?? actor.name,
      validity: { value: 'pending' },
      everValid: false,
      stage: 'new',
      createdAt: at,
      updatedAt: at,
      events: [{ at, actor, action: 'received' }],
    };
    // I-L2: same contact, different travel need → link, do not merge.
    const related = relatedLinks(lead, this.leads);
    if (related.length) {
      lead.relatedLeadIds = related;
      for (const id of related) {
        const other = this.get(id);
        replaceById(this.leads, {
          ...other,
          relatedLeadIds: [...new Set([...(other.relatedLeadIds ?? []), lead.id])],
        });
      }
    }
    this.leads.push(lead);
    return lead;
  }

  patch(id: string, dto: PatchLeadInput, actor: Actor): Lead {
    const before = this.get(id);
    const next = applyLeadPatch(before, dto, this.clock.now());
    const changes = [
      next.validity.value !== before.validity.value ? `validity → ${next.validity.value}` : '',
      next.stage !== before.stage ? `stage → ${next.stage}` : '',
      next.owner !== before.owner ? `owner → ${next.owner}` : '',
      dto.order !== undefined ? 'order' : '',
      dto.firstResponseAt !== undefined ? 'first response' : '',
    ].filter(Boolean);
    return replaceById(
      this.leads,
      stamp(
        next,
        this.clock.now(),
        actor,
        'updated',
        changes.join(', '),
        dto.validityReason ?? dto.lostReason,
      ),
    );
  }

  mergeSuggestions(): MergeSuggestion[] {
    return mergeSuggestions(this.leads);
  }

  merge(id: string, intoId: string, actor: Actor): Lead {
    const [gone, kept] = mergeLeads(this.get(id), this.get(intoId));
    const now = this.clock.now();
    replaceById(this.leads, stamp(gone, now, actor, `merged into ${intoId}`));
    return replaceById(this.leads, stamp(kept, now, actor, 'merged', id));
  }

  /** I-L3: the CSV the Feedback agent receives. */
  exportCsv(): string {
    return toCsv(this.list().map(deidentify));
  }
}
