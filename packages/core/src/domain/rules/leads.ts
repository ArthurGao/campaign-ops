import type { Stage, Validity } from '../enums';
import { AppError } from '../errors';
import type { Lead, MergeSuggestion } from '../types';

const normEmail = (e?: string) => e?.trim().toLowerCase() || undefined;
const normPhone = (p?: string) => p?.replace(/\D/g, '') || undefined;

export function sameContact(a: Lead, b: Lead): ('email' | 'phone')[] {
  const matched: ('email' | 'phone')[] = [];
  if (normEmail(a.contact.email) && normEmail(a.contact.email) === normEmail(b.contact.email)) matched.push('email');
  if (normPhone(a.contact.phone) && normPhone(a.contact.phone) === normPhone(b.contact.phone)) matched.push('phone');
  return matched;
}

/** I-L2: same travel need = same tour and same travel date (both unknown counts as same). */
export function sameTravelNeed(a: Lead, b: Lead): boolean {
  return a.enquiry.tour === b.enquiry.tour && (a.enquiry.travelDate ?? '') === (b.enquiry.travelDate ?? '');
}

/** Pairs to offer for merging: the newer record merges into the older one. */
export function mergeSuggestions(leads: readonly Lead[]): MergeSuggestion[] {
  const open = leads.filter((l) => !l.mergedInto).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const out: MergeSuggestion[] = [];
  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      const [older, newer] = [open[i], open[j]];
      const matchedOn = sameContact(older, newer);
      if (matchedOn.length && sameTravelNeed(older, newer)) {
        out.push({ leadId: newer.id, intoId: older.id, matchedOn, tour: older.enquiry.tour, travelDate: older.enquiry.travelDate });
      }
    }
  }
  return out;
}

export function assertMergeable(lead: Lead, into: Lead): void {
  if (lead.id === into.id) throw new AppError('VALIDATION', 'A lead cannot be merged into itself.');
  if (lead.mergedInto || into.mergedInto) {
    throw new AppError('INVALID_TRANSITION', 'One of these leads was already merged.', `Merged into ${lead.mergedInto ?? into.mergedInto}.`);
  }
  if (!sameContact(lead, into).length) {
    throw new AppError('INVALID_TRANSITION', `${lead.id} and ${into.id} are different contacts.`, 'Only the same email or phone can be merged.');
  }
  if (!sameTravelNeed(lead, into)) {
    throw new AppError(
      'INVALID_TRANSITION',
      `${lead.id} and ${into.id} are different travel needs.`,
      'Keep both records; they are linked as related leads instead.',
    );
  }
}

/** Returns [merged-away lead, surviving lead]. The survivor keeps its own validity and stage. */
export function mergeLeads(lead: Lead, into: Lead): [Lead, Lead] {
  assertMergeable(lead, into);
  return [
    { ...lead, mergedInto: into.id },
    {
      ...into,
      mergedFrom: [...(into.mergedFrom ?? []), lead.id],
      everValid: into.everValid || lead.everValid,
      contact: {
        name: into.contact.name,
        email: into.contact.email ?? lead.contact.email,
        phone: into.contact.phone ?? lead.contact.phone,
      },
    },
  ];
}

/** Link same-contact leads with a different travel need (I-L2). */
export function relatedLinks(lead: Lead, leads: readonly Lead[]): string[] {
  return leads.filter((o) => o.id !== lead.id && !o.mergedInto && sameContact(lead, o).length && !sameTravelNeed(lead, o)).map((o) => o.id);
}

export type LeadPatch = {
  validity?: Validity;
  validityReason?: string;
  stage?: Stage;
  lostReason?: string;
  owner?: string;
  firstResponseAt?: string;
  order?: Lead['order'] | null;
};

export function applyLeadPatch(lead: Lead, patch: LeadPatch, now: Date): Lead {
  if (lead.mergedInto) throw new AppError('INVALID_TRANSITION', `${lead.id} was merged into ${lead.mergedInto}.`, `Edit ${lead.mergedInto} instead.`);
  let next: Lead = { ...lead };
  if (patch.validity !== undefined) {
    if (patch.validity === 'invalid' && !patch.validityReason?.trim()) {
      throw new AppError('VALIDATION', 'An invalid lead needs a reason.', 'For example "wants independent travel".');
    }
    next = {
      ...next,
      validity: { value: patch.validity, decidedAt: now.toISOString(), ...(patch.validityReason ? { reason: patch.validityReason } : {}) },
      everValid: lead.everValid || patch.validity === 'valid',
    };
  }
  if (patch.stage !== undefined) {
    if (patch.stage === 'lost' && !(patch.lostReason ?? lead.lostReason)?.trim()) {
      throw new AppError('VALIDATION', 'A lost lead needs a reason.', 'Record why it was lost.');
    }
    next = { ...next, stage: patch.stage, ...(patch.stage === 'lost' ? { lostReason: patch.lostReason ?? lead.lostReason } : {}) };
  }
  if (patch.owner !== undefined) next.owner = patch.owner;
  if (patch.firstResponseAt !== undefined) next.firstResponseAt = patch.firstResponseAt;
  if (patch.order !== undefined) next.order = patch.order ?? undefined;
  return next;
}

/** I-L1: valid once means valid in the history, even if later lost. Merged-away records do not count. */
export function historicallyValidCount(leads: readonly Lead[]): number {
  return leads.filter((l) => l.everValid && !l.mergedInto).length;
}

export const DEIDENTIFIED_COLUMNS = [
  'id',
  'receivedAt',
  'tour',
  'travelDate',
  'people',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'channelLabel',
  'campaignId',
  'adId',
  'utmContent',
  'utmTerm',
  'landingPageVersion',
  'attribution',
  'selfReportedSource',
  'firstResponseAt',
  'validity',
  'validityReason',
  'everValid',
  'stage',
  'lostReason',
  'orderPeople',
] as const;

export type DeidentifiedRow = Record<(typeof DEIDENTIFIED_COLUMNS)[number], string | number | boolean | undefined>;

/** I-L3 / R9: strip contact details, click ids and free-text notes. */
export function deidentify(lead: Lead): DeidentifiedRow {
  return {
    id: lead.id,
    receivedAt: lead.receivedAt,
    tour: lead.enquiry.tour,
    travelDate: lead.enquiry.travelDate,
    people: lead.enquiry.people,
    utmSource: lead.source.utmSource,
    utmMedium: lead.source.utmMedium,
    utmCampaign: lead.source.utmCampaign,
    channelLabel: lead.source.channelLabel,
    campaignId: lead.adDetail.campaignId,
    adId: lead.adDetail.adId,
    utmContent: lead.adDetail.utmContent,
    utmTerm: lead.adDetail.utmTerm,
    landingPageVersion: lead.adDetail.landingPageVersion,
    attribution: lead.adDetail.resolution,
    selfReportedSource: lead.selfReportedSource,
    firstResponseAt: lead.firstResponseAt,
    validity: lead.validity.value,
    validityReason: lead.validity.reason,
    everValid: lead.everValid,
    stage: lead.stage,
    lostReason: lead.lostReason,
    orderPeople: lead.order?.people,
  };
}

const csvCell = (v: unknown) => {
  if (v === undefined || v === null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: readonly DeidentifiedRow[]): string {
  const lines = [DEIDENTIFIED_COLUMNS.join(','), ...rows.map((r) => DEIDENTIFIED_COLUMNS.map((c) => csvCell(r[c])).join(','))];
  return `${lines.join('\n')}\n`;
}
