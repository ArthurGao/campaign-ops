import { readFileSync } from 'node:fs';
import path from 'node:path';
import { matchRoutes } from 'react-router-dom';
import { buildSeed } from '@campaign-ops/core';
import { router } from '@/router';
import { copy } from './copy';
import { SOURCE_MAP, sourceHref } from './source-map';

// Saved copy of the artifact the map points into (docs/source/workflow.html).
const html = readFileSync(path.resolve(process.cwd(), '../docs/source/workflow.html'), 'utf8');
const seed = buildSeed();
const entries = SOURCE_MAP.entries;
const appLinks = entries.flatMap((e) => e.app.map((l) => ({ key: e.key, ...l })));

/** Items rendered from one of the artifact's script arrays, e.g. `const EXC = [ … ];`. */
function scriptArray(name: string): string {
  const m = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\];`).exec(html);
  if (!m) throw new Error(`${name} not found in the artifact`);
  return m[1];
}
const stepCount = (scriptArray('STEPS').match(/\{n:\d+,/g) ?? []).length;
const excCount = (scriptArray('EXC').match(/^\s*\["/gm) ?? []).length;
const ctrlCount = (scriptArray('CTRL').match(/^\s*\["/gm) ?? []).length;

/** True when the artifact will have an element with this id once its scripts have run. */
function artifactHasAnchor({ anchor, find }: { anchor: string; find?: string }): boolean {
  if (find)
    return new RegExp(`<(td|h4|summary)>${find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</`).test(
      html,
    );
  const n = (prefix: string) => Number(anchor.slice(prefix.length));
  if (anchor.startsWith('step-')) return n('step-') >= 1 && n('step-') <= stepCount;
  if (anchor.startsWith('ex-')) return n('ex-') >= 1 && n('ex-') <= excCount;
  if (anchor.startsWith('rule-')) return n('rule-') >= 1 && n('rule-') <= ctrlCount;
  if (anchor.startsWith('agent-')) return html.includes(`  ${anchor.slice(6)}:{name:`);
  if (anchor.startsWith('ref-')) return html.includes(anchor.slice(4));
  return html.includes(`id="${anchor}"`);
}

describe('source map', () => {
  it('reads the artifact it was written against', () => {
    expect([stepCount, excCount, ctrlCount]).toEqual([10, 8, 6]);
  });

  it('numbers exceptions and rules in the same order as the Workflow screen', () => {
    expect(copy.workflow.exceptions).toHaveLength(excCount);
    expect(copy.workflow.rules).toHaveLength(ctrlCount);
  });

  it('has unique keys', () => {
    expect(new Set(entries.map((e) => e.key)).size).toBe(entries.length);
  });

  it('points every entry at a place that exists in the artifact', () => {
    const missing = entries.filter((e) => !artifactHasAnchor(e)).map((e) => e.anchor);
    expect(missing).toEqual([]);
  });

  it('points every app link at a real route', () => {
    const unrouted = appLinks.filter((l) => {
      const { pathname } = new URL(l.path, 'http://app');
      const match = matchRoutes(router.routes, pathname)?.at(-1);
      return !match || match.route.path === '*';
    });
    expect(unrouted).toEqual([]);
  });

  it('links only to records that exist in the seed', () => {
    const ids = new Set<string>([
      ...seed.facts.map((f) => f.id),
      ...seed.evidence.map((e) => e.id),
      ...seed.tasks.map((t) => t.id),
      ...seed.runs.map((r) => r.id),
      ...seed.briefs.map((b) => b.id),
      ...seed.packages.map((p) => p.id),
      ...seed.leads.map((l) => l.id),
    ]);
    const referenced = appLinks.flatMap((l) => {
      const url = new URL(l.path, 'http://app');
      const fromQuery = ['fact', 'focus', 'task', 'lead']
        .map((k) => url.searchParams.get(k))
        .filter((v): v is string => !!v);
      const fromPath = /^\/(?:publish|factory|agents\/runs)\/([^/]+)$/.exec(url.pathname)?.[1];
      return fromPath ? [...fromQuery, fromPath] : fromQuery;
    });
    expect(referenced.length).toBeGreaterThan(15);
    expect(referenced.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('names records the seed actually has for every entity entry', () => {
    const known = new Set<string>([
      ...seed.facts.map((f) => f.id),
      ...seed.factVersions.map((v) => v.version),
      ...seed.evidence.map((e) => e.id),
      ...seed.tasks.map((t) => t.id),
      ...seed.briefs.map((b) => b.id),
      ...seed.briefs.flatMap((b) => b.receipts.flatMap((r) => r.assets.map((a) => a.assetId))),
      ...seed.packages.map((p) => p.id),
      ...seed.packages.map((p) => p.caption.version),
      ...seed.leads.map((l) => l.id),
    ]);
    const entityKeys = entries.filter((e) => e.kind === 'entity').map((e) => e.key);
    // ADS-007 is the source's name for the pause suggestion; the app keeps it as a run output.
    expect(entityKeys.filter((k) => !known.has(k))).toEqual(['ADS-007']);
  });

  it('builds artifact links that carry only a fragment', () => {
    expect(sourceHref('step-4')).toBe('https://claude.ai/artifact/TpdZz945Dm6MVEvLeBNLFN#step-4');
  });
});
