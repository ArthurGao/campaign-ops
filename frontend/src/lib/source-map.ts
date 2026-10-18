import data from './source-map.json';

/**
 * Two-way map between the source workflow artifact and the app (docs/workflow-source.md).
 * The same JSON is embedded into the artifact by scripts/source-links.mjs, so both sides
 * resolve links from one list.
 */
export type SourceKind = 'step' | 'agent' | 'exception' | 'rule' | 'section' | 'entity' | 'term';

export type SourceEntry = {
  key: string;
  kind: SourceKind;
  /** Element id in the artifact page. */
  anchor: string;
  /**
   * For anchors the artifact does not have yet: the exact text of the glossary cell, heading or
   * summary that the generated block gives this id.
   */
  find?: string;
  /** Chinese wording used in the artifact; search only, never shown in the app UI. */
  zh: string;
  en: string;
  app: { label: string; path: string }[];
};

export const SOURCE_MAP = data as { appUrl: string; sourceUrl: string; entries: SourceEntry[] };

const byKey = new Map(SOURCE_MAP.entries.map((e) => [e.key, e]));

export function sourceEntry(key: string): SourceEntry | undefined {
  return byKey.get(key);
}

/** Link into the artifact at an element; only the #fragment reaches the artifact page. */
export function sourceHref(anchor: string): string {
  return `${SOURCE_MAP.sourceUrl}#${anchor}`;
}
