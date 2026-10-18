import { replaceById, stamp } from '../common/audit';
import type { Clock } from '../domain/clock';
import { RECON_CHANNELS, REVIEW_DECISIONS, type Role } from '../domain/enums';
import { AppError, requireRole } from '../domain/errors';
import {
  assertReviewEditable,
  assertReviewSendable,
  buildReview,
  reviewWeeks,
} from '../domain/rules/review';
import { weekOf } from '../domain/rules/week';
import type {
  Actor,
  CampaignReview,
  ReviewChannelDecision,
  ReviewNumbers,
  ReviewView,
} from '../domain/types';
import type { MemoryStore } from '../store/memory.store';

export type SaveReviewInput = { decisions?: ReviewChannelDecision[]; nextPhase?: string };

const PM_ONLY: readonly Role[] = ['pm'];
const REVIEW_ID = 'REV-1';

/**
 * The first full review (source week 4): each channel over the full weeks with the rule's
 * suggestion, the PM's decision per channel, the next phase, sent to the client once (D-40).
 */
export class ReviewService {
  constructor(
    private readonly store: MemoryStore,
    private readonly clock: Clock,
  ) {}

  private review(): CampaignReview | undefined {
    return this.store.data.reviews.find((r) => r.id === REVIEW_ID);
  }

  get(): ReviewView {
    const { recon, funnel, facts, settings } = this.store.data;
    const review = this.review();
    const view = buildReview({
      weeks: review?.numbers?.weeks ?? reviewWeeks(funnel, weekOf(this.clock.now())),
      recon,
      funnel,
      facts,
      settings,
      ...(review ? { review } : {}),
    });
    // A sent review shows what the client was sent, even if the data is corrected later.
    return review?.numbers ? { ...view, ...review.numbers } : view;
  }

  save(input: SaveReviewInput, actor: Actor): ReviewView {
    requireRole(actor, PM_ONLY, 'write the review');
    const before = this.review();
    assertReviewEditable(before);
    for (const d of input.decisions ?? []) {
      if (
        !(RECON_CHANNELS as readonly string[]).includes(d.channel) ||
        !(REVIEW_DECISIONS as readonly string[]).includes(d.decision)
      ) {
        throw new AppError(
          'VALIDATION',
          `${d.channel}: ${d.decision} is not a review decision.`,
          `Use one of ${REVIEW_DECISIONS.join(', ')} for a channel in the review.`,
          400,
        );
      }
    }
    const now = this.clock.now();
    const fields = {
      decisions: input.decisions ?? before?.decisions ?? [],
      nextPhase: input.nextPhase ?? before?.nextPhase ?? '',
    };
    if (before) {
      replaceById(
        this.store.data.reviews,
        stamp({ ...before, ...fields }, now, actor, 'draft saved'),
      );
    } else {
      const at = now.toISOString();
      this.store.data.reviews.push({
        id: REVIEW_ID,
        status: 'draft',
        ...fields,
        createdAt: at,
        updatedAt: at,
        events: [{ at, actor, action: 'draft saved' }],
      });
    }
    return this.get();
  }

  send(actor: Actor): ReviewView {
    requireRole(actor, PM_ONLY, 'send the review');
    const view = this.get();
    const review = assertReviewSendable(this.review(), view);
    const now = this.clock.now();
    const { weeks, channels, totals, assumption } = view;
    const numbers: ReviewNumbers = { weeks, channels, totals, assumption };
    replaceById(
      this.store.data.reviews,
      stamp(
        { ...review, status: 'sent' as const, numbers, sentAt: now.toISOString(), sentBy: actor },
        now,
        actor,
        'sent',
        'to the client',
      ),
    );
    return this.get();
  }
}
