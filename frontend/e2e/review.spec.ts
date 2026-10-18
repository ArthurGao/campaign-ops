import { expect, test } from '@playwright/test';
import { actAs, pick } from './helpers';

// Campaign review (D-40): per channel scale / keep / stop / wait, sent to the client once.
test('the PM reviews each channel, writes the next phase and sends the review once', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('link', { name: 'Review' }).click();
  await expect(page.getByText(/^Weeks of Mon, 28 Sept and Mon, 5 Oct/)).toBeVisible();

  const row = (name: string) => page.locator('tbody tr', { hasText: name });
  await expect(row('Google search')).toContainText('Lowest paid CPL: $76.00 over 5 valid leads.');
  await expect(row('Meta ads')).toContainText('Only 3 valid leads: too few to judge the CPL.');
  await expect(row('Tiktok')).toContainText('No visits in 2 weeks.');
  await expect(page.getByRole('row', { name: /^All channels/ })).toContainText('$105.00');
  await expect(
    page.getByText('Google search: scale within the pre-approved cap of $600.00'),
  ).toBeVisible();
  await expect(page.getByText(/Real: 2 of 15 valid leads booked \(13\.3%\)/)).toBeVisible();

  await pick(page, 'Decision for Meta ads', 'Stop');
  await page.getByLabel('Note for Meta ads').fill('Ad set B spent with no valid leads');
  await page.getByLabel('Next phase').fill('- Hours: 1 h from site to ads');
  await expect(page.getByRole('button', { name: 'Send to client' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.getByRole('button', { name: 'Send to client' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Send review' }).click();
  await expect(page.getByText(/^Sent .* by Jordan Reid\./)).toBeVisible();
  await expect(row('Meta ads')).toContainText('Ad set B spent with no valid leads');
  await expect(page.getByRole('combobox', { name: 'Decision for Meta ads' })).toHaveCount(0);

  await actAs(page, 'Client approver');
  await expect(page.getByText('Hours: 1 h from site to ads')).toBeVisible();
});

test('AI cost shows machine time, tokens and check time per week, and an estimate', async ({
  page,
}) => {
  await page.goto('/agents#ai-cost');
  const cost = page.locator('section', { has: page.getByRole('heading', { name: 'AI cost' }) });
  await expect(cost.getByRole('row', { name: /^Mon, 5 Oct/ })).toContainText('63,500');
  await expect(cost.getByRole('row', { name: /^Estimate per week/ })).toContainText('31,750');
  await expect(cost).toContainText('35 of 40 credits');
});
