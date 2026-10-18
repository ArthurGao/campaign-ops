/** Fill the settings UTM template. The agent never edits this link (docs/03-agents.md). */
export function renderUtm(
  template: string,
  values: { base: string; source: string; medium: string; content: string },
): string {
  return template
    .replace('{base}', values.base)
    .replace('{source}', encodeURIComponent(values.source))
    .replace('{medium}', encodeURIComponent(values.medium))
    .replace('{content}', encodeURIComponent(values.content));
}

/** utm_source / utm_medium for a package channel such as 'facebook_feed'. */
export function utmForChannel(channel: string): { source: string; medium: string } {
  const source = channel.split('_')[0];
  const paid = channel.includes('ads') || channel === 'google_search';
  return {
    source: source === 'google' ? 'google' : source,
    medium: paid ? 'paid' : 'organic_social',
  };
}

/** Task channel → publish package channel. */
export const PACKAGE_CHANNEL: Record<string, string> = {
  facebook: 'facebook_feed',
  instagram: 'instagram_reels',
  youtube: 'youtube_video',
  tiktok: 'tiktok',
  google_search: 'google_search',
  meta_ads: 'meta_ads',
  website: 'website',
};
