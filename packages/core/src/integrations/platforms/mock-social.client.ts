import { type MemoryStore } from '../../store/memory.store';
import type { SocialPlatformClient } from './social.client';

/** Returns the seeded live text for a post URL; unknown URLs return the approved caption as posted. */
export class MockSocialClient implements SocialPlatformClient {
  constructor(private readonly store: MemoryStore) {}

  async fetchLivePost(postUrl: string): Promise<string | undefined> {
    const seeded = this.store.data.livePosts[postUrl];
    if (seeded !== undefined) return seeded;
    const pkg = this.store.data.packages.find((p) =>
      p.publishLog.some((e) => e.postUrl === postUrl),
    );
    if (!pkg) return undefined;
    const approved = pkg.captionHistory.find(
      (c) => c.version === pkg.approval.approvedCaptionVersion,
    );
    return (approved ?? pkg.caption).text;
  }
}
