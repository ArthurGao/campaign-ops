import { PAID_RECON_CHANNELS, type ReconChannel } from '../enums';
import { AppError } from '../errors';
import type {
  AssumptionCheck,
  CampaignReview,
  FactEntry,
  FunnelRow,
  ReconRow,
  ReviewChannelNumbers,
  ReviewChannelView,
  ReviewView,
  Settings,
  WeekId,
} from '../types';
import { funnelWeeks, MIN_FUNNEL_BASE } from './funnel';
import { formatNzd } from './money';
import { overReportRatio, paidCpl } from './recon';
import { weekOf } from './week';

/** Under this many valid leads a paid channel's CPL is not judged (source: small samples, no conclusions). */
export const MIN_REVIEW_LEADS = 5;
/** Source: "数据不到两周，只做小调整，大的结论放到第 5 周". */
export const MIN_REVIEW_WEEKS = 2;
/** The internal fact whose assumption the review checks against real numbers. */
export const CLOSE_RATE_FACT = 'FS-23';

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** Weeks with data that have ended, oldest first. */
export function reviewWeeks(funnel: readonly FunnelRow[], currentWeek: WeekId): WeekId[] {
  return [...new Set(funnel.map((r) => weekOf(r.weekStart)))].filter((w) => w < currentWeek).sort();
}

function suggest(
  t: ReviewChannelNumbers,
  weeks: number,
  bigCalls: boolean,
  bestCpl: number | undefined,
): Pick<ReviewChannelView, 'suggestion' | 'reason'> {
  const leads = plural(t.validLeads, 'valid lead');
  if (t.spendCents > 0) {
    if (t.validLeads === 0)
      return {
        suggestion: 'stop',
        reason: `Spent ${formatNzd(t.spendCents)} with no valid leads.`,
      };
    if (t.validLeads < MIN_REVIEW_LEADS)
      return { suggestion: 'wait', reason: `Only ${leads}: too few to judge the CPL.` };
    const cpl = formatNzd(t.paidCpl ?? 0);
    if (bigCalls && t.paidCpl === bestCpl)
      return { suggestion: 'scale', reason: `Lowest paid CPL: ${cpl} over ${leads}.` };
    return { suggestion: 'keep', reason: `CPL ${cpl} over ${leads}.` };
  }
  if (t.visits === 0)
    return { suggestion: 'stop', reason: `No visits in ${plural(weeks, 'week')}.` };
  if (t.validLeads > 0) return { suggestion: 'keep', reason: `${leads} without spend.` };
  return { suggestion: 'wait', reason: `${t.visits} visits but no valid leads yet.` };
}

export function assumptionCheck(
  fact: FactEntry | undefined,
  validLeads: number,
  deposits: number,
): AssumptionCheck {
  return {
    factId: CLOSE_RATE_FACT,
    statement: fact?.statement ?? '',
    validLeads,
    deposits,
    rate: validLeads ? deposits / validLeads : null,
    enough: validLeads >= MIN_FUNNEL_BASE,
  };
}

/** The review screen: each channel over the full weeks, the rule's suggestion, the assumption check. */
export function buildReview(input: {
  weeks: WeekId[];
  recon: readonly ReconRow[];
  funnel: readonly FunnelRow[];
  facts: readonly FactEntry[];
  settings: Settings;
  review?: CampaignReview;
}): ReviewView {
  const { weeks, recon, funnel, facts, settings, review } = input;
  const inReview = (r: { weekStart: string }) => weeks.includes(weekOf(r.weekStart));
  const last = weeks.at(-1);
  const lastWeek = last
    ? funnelWeeks(
        funnel.filter((r) => weekOf(r.weekStart) <= last),
        1,
      )[0]
    : undefined;

  // One map per channel, fed by both tables (the funnel holds CRM valid leads, recon the spend).
  const totals = new Map<ReconChannel, ReviewChannelNumbers>();
  const at = (c: ReconChannel) => {
    const t = totals.get(c) ?? {
      spendCents: 0,
      visits: 0,
      validLeads: 0,
      deposits: 0,
      platformReportedConversions: 0,
    };
    totals.set(c, t);
    return t;
  };
  for (const r of funnel.filter(inReview)) {
    const t = at(r.channel);
    t.visits += r.visits;
    t.validLeads += r.validLeads;
    t.deposits += r.deposits;
  }
  for (const r of recon.filter(inReview)) {
    const t = at(r.channel);
    t.spendCents += r.spendCents;
    t.platformReportedConversions += r.platformReportedConversions;
  }
  for (const t of totals.values()) {
    t.paidCpl = paidCpl(t.spendCents, t.validLeads);
    t.overReportRatio = overReportRatio(t.platformReportedConversions, t.validLeads);
  }

  const bigCallsAllowed = weeks.length >= MIN_REVIEW_WEEKS;
  const judged = [...totals.values()].filter(
    (t) => typeof t.paidCpl === 'number' && t.validLeads >= MIN_REVIEW_LEADS,
  );
  const bestCpl = judged.length ? Math.min(...judged.map((t) => t.paidCpl as number)) : undefined;
  const channels = [...totals.entries()].map(([channel, t]) => ({
    channel,
    ...t,
    breakPoint: lastWeek?.channels.find((c) => c.channel === channel)?.breakPoint ?? null,
    ...suggest(t, weeks.length, bigCallsAllowed, bestCpl),
  }));

  const sum = (k: 'spendCents' | 'validLeads' | 'deposits') =>
    channels.reduce((n, c) => n + c[k], 0);
  const paid = channels.filter((c) =>
    (PAID_RECON_CHANNELS as readonly ReconChannel[]).includes(c.channel),
  );
  return {
    weeks,
    bigCallsAllowed,
    channels,
    totals: {
      spendCents: sum('spendCents'),
      validLeads: sum('validLeads'),
      deposits: sum('deposits'),
      // As in reconciliation: total paid CPL counts only valid leads from paid channels.
      paidCpl: paidCpl(
        sum('spendCents'),
        paid.reduce((n, c) => n + c.validLeads, 0),
      ),
    },
    assumption: assumptionCheck(
      facts.find((f) => f.id === CLOSE_RATE_FACT),
      sum('validLeads'),
      sum('deposits'),
    ),
    budgetCapCents: settings.preApprovedScope.budgetCapCentsByChannel,
    ...(review ? { review } : {}),
  };
}

export function assertReviewEditable(review: CampaignReview | undefined): void {
  if (review?.status === 'sent') {
    throw new AppError(
      'INVALID_TRANSITION',
      'The review was sent; it is not edited afterwards.',
      'Put changes in the next weekly report.',
    );
  }
}

export function assertReviewSendable(
  review: CampaignReview | undefined,
  view: ReviewView,
): CampaignReview {
  if (!review) {
    throw new AppError('VALIDATION', 'There is no review yet.', 'Save a draft first.', 400);
  }
  assertReviewEditable(review);
  const decided = new Set(review.decisions.map((d) => d.channel));
  const missing = view.channels.filter((c) => !decided.has(c.channel)).map((c) => c.channel);
  if (missing.length) {
    throw new AppError(
      'VALIDATION',
      `Decide every channel before sending: ${missing.join(', ')}.`,
      'Scale, keep, stop or wait: the client reads one line per channel.',
      400,
    );
  }
  if (!review.nextPhase.trim()) {
    throw new AppError(
      'VALIDATION',
      'The review needs the next phase before it is sent.',
      'Say how the 16 hours and the budget move next.',
      400,
    );
  }
  const scaled = review.decisions.filter((d) => d.decision === 'scale').map((d) => d.channel);
  if (!view.bigCallsAllowed && scaled.length) {
    throw new AppError(
      'VALIDATION',
      `Under two full weeks of data: scale ${scaled.join(', ')} at the next review.`,
      'Small changes and stop-losses only until then.',
      400,
    );
  }
  return review;
}
