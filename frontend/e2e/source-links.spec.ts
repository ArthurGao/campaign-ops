import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));

type Entry = { key: string; anchor: string; app: { label: string; path: string }[] };
const map = JSON.parse(readFileSync(path.resolve(here, '../src/lib/source-map.json'), 'utf8')) as {
  appUrl: string;
  sourceUrl: string;
  entries: Entry[];
};

const hashLinks = [
  ...new Set(map.entries.flatMap((e) => e.app.map((l) => l.path)).filter((p) => p.includes('#'))),
];

test.describe('app side', () => {
  test('every deep link the source plan uses lands on its target', async ({ page }) => {
    expect(hashLinks.length).toBeGreaterThan(20);
    for (const link of hashLinks) {
      await page.goto(link);
      const target = page.locator(`[id="${decodeURIComponent(link.split('#')[1])}"]`);
      await expect(target, link).toBeInViewport();
    }
  });

  test('the Workflow screen links each step, exception and rule to its place in the source', async ({
    page,
  }) => {
    await page.goto('/workflow');
    await expect(
      page.locator('#step-4').getByRole('link', { name: /Source plan: step 4/ }),
    ).toHaveAttribute('href', `${map.sourceUrl}#step-4`);
    await expect(page.locator('#ex-7').getByRole('link', { name: /Source plan/ })).toHaveAttribute(
      'href',
      `${map.sourceUrl}#ex-7`,
    );
    await expect(page.locator('#ex-7')).toContainText('Live content differs from approved');
    await expect(page.locator('#rule-3')).toContainText('Versions');
    await expect(page.locator('#rule-3').getByRole('link')).toHaveAttribute(
      'href',
      `${map.sourceUrl}#rule-3`,
    );
  });

  test('records the source mentions carry a link back to it', async ({ page }) => {
    await page.goto('/fact-sheet');
    await expect(
      page.locator('#fact-FS-04').getByRole('link', { name: /Source plan: FS-04/ }),
    ).toHaveAttribute('href', `${map.sourceUrl}#ref-FS-04`);
    // FS-16 Seats is the app's own addition; the source never mentions it.
    await expect(
      page.locator('#fact-FS-16').getByRole('link', { name: /Source plan/ }),
    ).toHaveCount(0);

    await page.goto('/publish/PUB-2027CT-012');
    await expect(page.getByRole('link', { name: /Source plan: PUB-2027CT-012/ })).toHaveAttribute(
      'href',
      `${map.sourceUrl}#ref-PUB-2027CT-012`,
    );
  });
});

test.describe('source side (generated artifact)', () => {
  const out = path.join(mkdtempSync(path.join(tmpdir(), 'co-links-')), 'workflow.linked.html');
  test.beforeAll(() => {
    execFileSync('node', [
      path.resolve(here, '../scripts/source-links.mjs'),
      path.resolve(here, '../../docs/source/workflow.html'),
      out,
    ]);
  });
  const url = (hash = '') => pathToFileURL(out).href + hash;

  test('search finds a record in the plan and in the app', async ({ page }) => {
    await page.goto(url());
    await page.getByRole('combobox', { name: '在原文和 CampaignOps 里找' }).fill('FS-04');
    const options = page.getByRole('option');
    await expect(options.filter({ hasText: 'FS-04 团期' })).toHaveAttribute('data-group', 'doc');
    await expect(options.filter({ hasText: 'FS-04 on the Fact Sheet' })).toHaveAttribute(
      'href',
      `${map.appUrl}/fact-sheet?fact=FS-04#fact-FS-04`,
    );

    await page.getByRole('combobox').fill('发布包');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#term-package$/);
    await expect(page.locator('#term-package')).toBeInViewport();
    await expect(page.locator('details', { has: page.locator('#term-package') })).toHaveAttribute(
      'open',
      '',
    );
  });

  test('a step link opens that step with its screens in the app', async ({ page }) => {
    await page.goto(url('#step-4'));
    const body = page.locator('#sb-4');
    await expect(body).toBeVisible();
    await expect(body.getByRole('link', { name: 'Pre-approved scope' })).toHaveAttribute(
      'href',
      `${map.appUrl}/settings#scope`,
    );
    await expect(page.locator('#sb-5')).toBeHidden();
  });

  test('exceptions, rules and agents get anchors and app links', async ({ page }) => {
    await page.goto(url('#ex-7'));
    await expect(page.locator('#ex-7')).toBeInViewport();
    await expect(page.locator('#ex-7')).toContainText('线上内容和批的不一样');
    await expect(page.locator('#ex-7').getByRole('link')).toHaveAttribute(
      'href',
      `${map.appUrl}/publish?status=mismatch`,
    );

    await page.goto(url('#agent-out'));
    await expect(page.locator('#adetail')).toContainText('出稿 Agent');
    await expect(
      page.locator('#adetail').getByRole('link', { name: 'Outbound agent' }),
    ).toHaveAttribute('href', `${map.appUrl}/agents#agent-outbound`);
  });

  test('record ids in the text link into the app, once per id as an anchor', async ({ page }) => {
    await page.goto(url('#ref-PUB-2027CT-012'));
    const ref = page.locator('#ref-PUB-2027CT-012');
    await expect(ref).toBeInViewport();
    await expect(ref).toHaveAttribute('href', `${map.appUrl}/publish/PUB-2027CT-012`);
    // "FS-v1.3" is one id, not "FS-v1" + ".3"; the longer key wins.
    await expect(page.locator('a.co-ref', { hasText: /^FS-v1\.3$/ }).first()).toHaveAttribute(
      'href',
      `${map.appUrl}/fact-sheet?tab=history`,
    );
    await expect(page.locator('[id="ref-FS-04"]')).toHaveCount(1);
  });
});
