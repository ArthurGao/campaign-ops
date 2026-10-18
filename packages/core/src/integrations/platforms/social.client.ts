/** Read-only access to live posts, used for post-publish verification. */
export interface SocialPlatformClient {
  fetchLivePost(postUrl: string): Promise<string | undefined>;
}
