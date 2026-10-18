import { expect, test } from '@playwright/test';
import { actAs, pick } from './helpers';

// Weekly loop (D-37): Monday plan, the PM's 16 hours, the one-page report to the client.
test('the PM plans the week, logs hours against the budget and sends the report once', async ({
  page,
}) => {
  await page.goto('/week');
  const plan = page.locator('section', {
    has: page.getByRole('heading', { name: 'Planned tasks' }),
  });
  await expect(plan.getByRole('row')).toHaveCount(7); // header + 6 seeded tasks
  await expect(plan.locator('#plan-TASK-030')).toContainText('Ad gates: 2/4 passed');
  await expect(plan.locator('#plan-TASK-021')).toContainText('Waiting on FS-04');
  await pick(page, 'Task to add', /^TASK-019 ·/);
  await page.getByRole('button', { name: 'Add to plan' }).click();
  await expect(plan.locator('#plan-TASK-019')).toContainText('Draft');

  await page.getByRole('tab', { name: /Hours/ }).click();
  await expect(page.getByRole('meter', { name: 'PM hours this week' })).toHaveAttribute(
    'aria-valuenow',
    '9.5',
  );
  await pick(page, 'Category', 'Buffer');
  await page.getByLabel('Hours', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Log time' }).click();
  await expect(page.locator('form').getByText('Buffer time needs a note.')).toBeVisible();
  await page.getByLabel('What came up').fill('Client call about the price');
  await page.getByRole('button', { name: 'Log time' }).click();
  await expect(page.getByRole('meter', { name: 'PM hours this week' })).toHaveAttribute(
    'aria-valuenow',
    '10.5',
  );
  await expect(page.locator('[data-category="buffer"]')).toContainText('1 h');
  await expect(page.getByRole('banner')).toContainText('10.5 / 16 h');

  await page.getByRole('tab', { name: 'Report' }).click();
  const done = page.getByLabel('Done this week');
  await expect(done).toHaveValue(/TASK-016 .*: live/);
  await expect(page.getByLabel('Next week')).toHaveValue(/TASK-019/);
  await expect(page.getByRole('button', { name: 'Send to client' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await done.fill('- TASK-016 enquiry form asks for the travel month');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.getByRole('button', { name: 'Send to client' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByText(/^Sent .* by Jordan Reid\./)).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Done this week' })).toHaveCount(0);

  await actAs(page, 'Client approver');
  await expect(page.getByText('TASK-016 enquiry form asks for the travel month')).toBeVisible();
  await page.getByRole('tab', { name: /Hours/ }).click();
  await expect(page.getByRole('button', { name: 'Log time' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
});

test('a past week is read-only and keeps its sent report and overrun', async ({ page }) => {
  await page.goto('/week?week=2026-10-05&tab=hours');
  await expect(page.getByText('0.5 h over')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log time' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Report' }).click();
  await expect(page.getByText(/^Sent .* by Jordan Reid\./)).toBeVisible();
  await expect(page.getByText('Meta ad set B spent with no valid leads this week')).toBeVisible();
  await page.getByRole('tab', { name: /Plan/ }).click();
  await expect(page.getByRole('button', { name: 'Remove TASK-021 from the plan' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Add to plan' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
});
