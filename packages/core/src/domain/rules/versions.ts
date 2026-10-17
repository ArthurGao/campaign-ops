/** 'CAP-012-v1' → 'CAP-012-v2', 'v2' → 'v3'. */
export function bumpVersionLabel(label: string): string {
  const m = /^(.*?)(\d+)$/.exec(label);
  if (!m) return `${label}-v2`;
  return `${m[1]}${Number(m[2]) + 1}`;
}

/** Version suffix of a factory asset id: 'VID-0031-4x5-v2' → 'v2'. */
export function assetVersion(assetId: string): string | undefined {
  return /-(v\d+)$/.exec(assetId)?.[1];
}
