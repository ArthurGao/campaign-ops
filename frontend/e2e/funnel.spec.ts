import { expect, test } from '@playwright/test';
import { pick } from './helpers';

// Funnel by layer (D-39): find the break point by week, then by channel.
test('the funnel shows where week 2 broke, in total and on Meta', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'By layer and channel →' }).click();
  await expect(page.getByRole('tab', { name: 'Funnel', selected: true })).toBeVisible();

  const byWeek = page.locator('section', {
    has: page.getByRole('heading', { name: 'By week, all channels' }),
  });
  const week2 = byWeek.getByRole('row', { name: /^Mon, 5 Oct/ });
  await expect(week2).toContainText('0.41%');
  await expect(week2).toContainText('▼ 39%');
  await expect(week2.getByRole('cell').last()).toContainText('Lead rate');
  await expect(byWeek.getByRole('row', { name: /^Mon, 12 Oct \(to date\)/ })).toContainText(
    'No step fell 20%',
  );

  const byChannel = page.locator('section', {
    has: page.getByRole('heading', { name: 'By channel' }),
  });
  await pick(page, 'Week', 'Mon, 5 Oct');
  const meta = byChannel.getByRole('row', { name: /^Meta ads/ });
  await expect(meta).toContainText('700');
  await expect(meta).toContainText('▼ 100%');
  await expect(meta.getByRole('cell').last()).toContainText('Lead rate');
  await expect(
    byChannel
      .getByRole('row', { name: /^Google search/ })
      .getByRole('cell')
      .last(),
  ).toHaveText('No step fell 20%');
});
