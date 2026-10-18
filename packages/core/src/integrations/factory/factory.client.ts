import type { BriefStatus } from '../../domain/enums';
import type { Brief, Receipt } from '../../domain/types';

export type FactoryCallbacks = {
  onStatus(status: Extract<BriefStatus, 'accepted' | 'in_production'>): void;
  onDelivered(receipt: Receipt): void;
};

/** The existing video factory: briefs out, receipts in. */
export interface FactoryClient {
  /** True when the factory dedupes by idempotency key (settings flag mirrors this). */
  readonly supportsIdempotency: boolean;
  submit(brief: Brief, callbacks: FactoryCallbacks): void;
}
