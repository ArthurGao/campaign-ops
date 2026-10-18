/**
 * Only absolute http(s) URLs become links. Anything else (javascript:, data:, relative, malformed)
 * returns undefined so callers render plain text: proof links and post URLs are user-entered.
 */
export function safeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}
