import { expect, test } from '@playwright/test';

// Regression: absolutely positioned sr-only labels once escaped the kanban scroller and widened the page.
const ROUTES = [
  '/',
  '/fact-sheet',
  '/evidence',
  '/tasks',
  '/agents',
  '/agents/runs/RUN-0003',
  '/factory/SOC-2027CT-003',
  '/publish/PUB-2027CT-012',
  '/leads',
  '/leads?tab=reconciliation',
  '/settings',
  '/week',
  '/week?tab=hours',
  '/week?tab=report',
  '/leads?tab=funnel',
  '/review',
];

for (const width of [1440, 390]) {
  test(`no page-level horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      // Measure only once data has rendered (skeletons gone, queries settled).
      await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);
      const { sw, cw } = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect({ route, sw }).toEqual({ route, sw: cw });
    }
  });
}

// Wide data tables scroll inside their own container; at desktop width the core columns must fit.
test('desktop tables fit their container at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ['/leads', '/evidence', '/fact-sheet']) {
    await page.goto(route);
    const table = page.locator('main table').first();
    await expect(table).toBeVisible();
    await page.waitForLoadState('networkidle');
    const { sw, cw } = await table.evaluate((t) => ({
      sw: t.parentElement!.scrollWidth,
      cw: t.parentElement!.clientWidth,
    }));
    expect({ route, overflow: sw - cw }).toEqual({ route, overflow: 0 });
  }
});
