import type { Clock, Scheduler } from '../../domain/clock';
import type { Brief, Receipt } from '../../domain/types';
import type { FactoryCallbacks, FactoryClient } from './factory.client';

/** Timeline of the simulated factory after submit (ms). */
export const FACTORY_DELAYS = { accepted: 1_000, inProduction: 2_500, delivered: 6_000 };

const RATIO_SLUG: Record<string, string> = {
  '16:9': '16x9',
  '9:16': '9x16',
  '4:5': '4x5',
  '1:1': '1x1',
};
const CREDITS_PER_ASSET = 4;

/** Asset family for a brief: SOC-2027CT-003 → VID-0031 (the seed's numbering). */
export function videoFamily(briefId: string): string {
  const n = Number(briefId.slice(-3));
  return `VID-${String(28 + n).padStart(4, '0')}`;
}

/** Simulated factory: submitted → accepted → in_production → delivered with a receipt. */
export class MockFactoryClient implements FactoryClient {
  readonly supportsIdempotency = false;

  constructor(
    private readonly scheduler: Scheduler,
    private readonly clock: Clock,
  ) {}

  submit(brief: Brief, cb: FactoryCallbacks): void {
    const version = `v${brief.receipts.length + 1}`;
    const previousCredits = brief.receipts.at(-1)?.creditsUsed ?? 0;
    this.scheduler.schedule(FACTORY_DELAYS.accepted, () => cb.onStatus('accepted'));
    this.scheduler.schedule(FACTORY_DELAYS.inProduction, () => cb.onStatus('in_production'));
    this.scheduler.schedule(FACTORY_DELAYS.delivered, () => {
      const family = videoFamily(brief.id);
      const receipt: Receipt = {
        version,
        deliveredAt: this.clock.now().toISOString(),
        assets: brief.deliverables.map((d) => {
          const assetId = `${family}-${RATIO_SLUG[d.ratio]}-${version}`;
          return {
            assetId,
            ratio: d.ratio,
            durationSec: 20,
            url: `https://factory.example/assets/${assetId}.mp4`,
            checksum: `sha256:${assetId
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
              .slice(-8)}…`,
          };
        }),
        factsUsed: [...brief.allowedFacts],
        musicLicense: {
          status: 'licensed',
          proof: `https://example.com/licenses/music-${family.toLowerCase()}.pdf`,
        },
        creditsUsed: previousCredits + CREDITS_PER_ASSET * brief.deliverables.length,
        renderAttempts: brief.receipts.length + 1,
        issues: [],
      };
      cb.onDelivered(receipt);
    });
  }
}
