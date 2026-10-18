import { expect, test } from '@playwright/test';
import { actAs, pick } from './helpers';

// Demo flows from docs/01-product-spec.md, clicked through the standalone frontend (mock API in the browser).

test('F1: an unconfirmed fact blocks a draft until the client confirms it, then it ships and verifies', async ({
  page,
}) => {
  await page.goto('/agents');

  // Outbound refuses to write the departure date while FS-04 is pending.
  const outbound = page.getByRole('article', { name: 'Outbound' });
  await outbound.getByRole('button', { name: 'Run' }).click();
  await outbound.getByRole('button', { name: 'Start run' }).click();
  await expect(
    page.getByRole('heading', { name: /Departure needed — FS-04 not confirmed/ }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Accept → create blocked task' }).click();
  const created = page.getByRole('link', { name: /Created TASK-\d+/ });
  await expect(created).toBeVisible();
  const taskId = (await created.textContent())!.match(/TASK-\d+/)![0];

  await created.click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.locator('[data-status="blocked"]')).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Unblock/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await drawer.getByRole('button', { name: 'Close' }).click();

  // The PM cannot confirm facts; the client approver can, with a source.
  await page.goto('/fact-sheet');
  const fs04 = page.getByRole('row', { name: /FS-04/ });
  await expect(fs04.getByRole('button', { name: /^Confirm/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await actAs(page, 'Client approver');
  await fs04.getByRole('button', { name: 'Confirm' }).click();
  await page.getByLabel('Source (document name or URL)').fill('Client email, 16 Oct 2026');
  await page.getByRole('button', { name: 'Confirm FS-04' }).click();
  await expect(fs04.locator('[data-status="confirmed"]')).toBeVisible();
  await expect(page.getByRole('main').getByText('FS-v1.4').first()).toBeVisible();

  // Re-run Outbound for the same task: a draft citing FS-04 unblocks it.
  await actAs(page, 'PM');
  await page.goto('/agents');
  await outbound.getByRole('button', { name: 'Run' }).click();
  await pick(page, 'Task (optional)', new RegExp(`^${taskId}`));
  await outbound.getByRole('button', { name: 'Start run' }).click();
  await page
    .getByRole('button', { name: `Accept → apply to ${taskId}` })
    .click({ timeout: 15_000 });
  await page.getByRole('link', { name: `Created ${taskId} →` }).click();

  await expect(drawer.locator('[data-status="draft"]')).toBeVisible();
  await drawer.getByRole('button', { name: 'Send to QA' }).click();
  await expect(drawer.locator('[data-status="qa"]')).toBeVisible();
  await drawer.getByRole('button', { name: 'Record QA…' }).click();
  await expect(drawer.getByRole('checkbox')).toHaveCount(4);
  for (const box of await drawer.getByRole('checkbox').all()) await box.click();
  await drawer.getByRole('button', { name: 'Pass QA and send for client approval' }).click();
  await expect(drawer.locator('[data-status="awaiting_approval"]')).toBeVisible();

  await actAs(page, 'Client approver');
  await drawer.getByRole('button', { name: /^Approve v\d+$/ }).click();
  await expect(drawer.locator('[data-status="approved"]')).toBeVisible();

  // Package: approve → schedule → publish → verify.
  await actAs(page, 'PM');
  await drawer.getByRole('button', { name: 'Create publish package' }).click();
  await pick(page, 'Asset', /VID-0031-4x5-v2/);
  await page.getByRole('button', { name: 'Create package' }).click();
  await expect(page).toHaveURL(/\/publish\/PUB-2027CT-013/);

  await actAs(page, 'Client approver');
  await page.getByRole('button', { name: 'Approve these versions' }).click();
  const pkgStatus = page.getByRole('main').locator('h2 + [data-status]');
  await expect(pkgStatus).toHaveAttribute('data-status', 'approved');
  await actAs(page, 'Executor');
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect(pkgStatus).toHaveAttribute('data-status', 'scheduled');
  await page.getByRole('button', { name: 'Mark published…', exact: true }).click();
  await page.getByLabel('Post URL').fill('https://facebook.example/demotravelnz/posts/ct27-013');
  await page.getByRole('button', { name: 'Mark published', exact: true }).click();
  await actAs(page, 'PM');
  await expect(pkgStatus).toHaveAttribute('data-status', 'published');
  await page.getByRole('button', { name: 'Record verified', exact: true }).click();
  await expect(pkgStatus).toHaveAttribute('data-status', 'verified');

  await page.goto(`/tasks?task=${taskId}`);
  await expect(page.getByRole('dialog').locator('[data-status="verified"]')).toBeVisible();
});

test('F5: an ad cannot go live until all four gates pass', async ({ page }) => {
  await page.goto('/tasks?task=TASK-030&tab=gates');
  await actAs(page, 'Executor');
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('button', { name: 'Mark live' }).click();
  await expect(drawer.getByRole('alert')).toContainText('AD_GATES_UNMET');
  await expect(drawer.getByRole('alert').locator('[data-gate="landingPageReady"]')).toHaveAttribute(
    'data-ok',
    'false',
  );
  await expect(
    drawer.getByRole('alert').locator('[data-gate="productFactsConfirmed"]'),
  ).toHaveAttribute('data-ok', 'false');

  // Source workflow: date, price and seats must be confirmed by the client before any ad.
  await actAs(page, 'Client approver');
  await page.goto('/fact-sheet');
  for (const id of ['FS-04', 'FS-15', 'FS-16']) {
    await page
      .getByRole('row', { name: new RegExp(id) })
      .getByRole('button', { name: 'Confirm' })
      .click();
    await page.getByLabel('Source (document name or URL)').fill('Client email, 16 Oct 2026');
    await page.getByRole('button', { name: `Confirm ${id}` }).click();
    await expect(
      page.getByRole('row', { name: new RegExp(id) }).locator('[data-status="confirmed"]'),
    ).toBeVisible();
  }

  await actAs(page, 'PM');
  await page.goto('/settings');
  await page.getByRole('switch', { name: 'Lead event fires once' }).click();
  await expect(page.getByText('Traffic ready', { exact: true })).toBeVisible();

  await actAs(page, 'Executor');
  await page.goto('/tasks?task=TASK-030&tab=gates');
  await expect(drawer.getByText('4/4 passed')).toBeVisible();
  await drawer.getByRole('button', { name: 'Mark live' }).click();
  await expect(drawer.locator('[data-status="live"]')).toBeVisible();
});

test('F6 and roles: zero-denominator CPL, and read-only roles see who can act', async ({
  page,
}) => {
  await page.goto('/leads?tab=reconciliation');
  await expect(page.getByText('No valid leads yet · spent $240.00').first()).toBeVisible();
  await actAs(page, 'Sales');
  await page.goto('/tasks');
  await expect(page.getByText('Read-only for Sales. Switch role to PM to edit.')).toBeVisible();
  await expect(page.getByRole('button', { name: /New task/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
});

test('F2: factory round-trip — brief from task, duplicate-checked send, receipt, QA, packages', async ({
  page,
}) => {
  await page.goto('/factory');
  await pick(page, 'New brief from a video task', /^TASK-026/);
  await expect(page.getByText('New brief from TASK-026')).toBeVisible();
  await page.getByRole('button', { name: 'Save and send to factory' }).click();
  await expect(page).toHaveURL(/\/factory\/SOC-2027CT-006/);
  const status = page.getByRole('main').locator('h2 + [data-status]');
  await expect(status).toHaveAttribute('data-status', 'delivered', { timeout: 20_000 });

  await expect(page.getByRole('checkbox')).toHaveCount(5);
  for (const box of await page.getByRole('checkbox').all()) await box.click();
  await page.getByRole('button', { name: 'Pass QA → create packages' }).click();
  await expect(status).toHaveAttribute('data-status', 'qa_passed');
  await expect(page.getByText('QA passed — packages created:')).toBeVisible();
});

test('F3: Feedback proposes pausing Meta ad set B; accepted in scope, applied, verified after launch', async ({
  page,
}) => {
  // D-32: the landing page is still not traffic-ready and prices are unconfirmed; a pause goes live anyway.
  await page.goto('/agents');
  const feedback = page.getByRole('article', { name: 'Feedback' });
  await feedback.getByRole('button', { name: 'Run' }).click();
  await feedback.getByRole('button', { name: 'Start run' }).click();
  await expect(page.getByRole('heading', { name: 'Pause Meta ad set B' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Within pre-approved scope')).toBeVisible();
  await page.getByRole('button', { name: 'Accept → ad change (pre-approved)' }).click();
  await page.getByRole('link', { name: /Created TASK-\d+ →/ }).click();

  const drawer = page.getByRole('dialog');
  await expect(drawer.locator('[data-status="approved"]')).toBeVisible();
  const taskId = (await drawer
    .getByText(/^TASK-\d+$/)
    .first()
    .textContent())!;
  await actAs(page, 'Executor');
  await drawer.getByRole('button', { name: 'Mark live', exact: true }).click();
  await expect(drawer.locator('[data-status="live"]')).toBeVisible();

  await actAs(page, 'PM');
  await page.goto('/agents');
  await feedback.getByRole('button', { name: 'Run' }).click();
  await pick(page, 'After launch of (optional)', new RegExp(`^${taskId}`));
  await feedback.getByRole('button', { name: 'Start run' }).click();
  await page.getByRole('button', { name: 'Accept → record match' }).click({ timeout: 15_000 });
  await page.getByRole('link', { name: `Created ${taskId} →` }).click();
  await expect(page.getByRole('dialog').locator('[data-status="verified"]')).toBeVisible();
});

test('F4: editing an approved caption bumps the version and needs approval again', async ({
  page,
}) => {
  await page.goto('/publish/PUB-2027CT-011');
  const status = page.getByRole('main').locator('h2 + [data-status]');
  await expect(status).toHaveAttribute('data-status', 'approved');
  await page.getByRole('button', { name: 'Edit caption…' }).click();
  await page
    .getByRole('textbox', { name: 'Caption' })
    .fill('Four cities in 30 seconds. Link in bio.');
  await page.getByRole('button', { name: 'Save new version' }).click();
  await expect(status).toHaveAttribute('data-status', 'awaiting_approval');
  await expect(page.getByText('Changes from CAP-011-v1 to CAP-011-v2')).toBeVisible();

  await actAs(page, 'Executor');
  await expect(
    page.getByRole('button', { name: /^Schedule — Needs client approval/ }),
  ).toHaveAttribute('aria-disabled', 'true');
  await actAs(page, 'Client approver');
  await page.getByRole('button', { name: 'Approve these versions' }).click();
  await expect(status).toHaveAttribute('data-status', 'approved');
  await expect(page.getByRole('main').getByText('CAP-011-v2').first()).toBeVisible();
});

test('Dashboard shows the ad gates in the first viewport', async ({ page }) => {
  await page.goto('/');
  const panel = page.locator('section', {
    has: page.getByRole('heading', { name: 'Paid traffic: ad gates' }),
  });
  await expect(panel).toBeInViewport();
  const row = panel.getByRole('listitem').filter({ hasText: 'TASK-030' });
  await expect(row.locator('[data-gate="landingPageReady"]')).toHaveAttribute('data-ok', 'false');
  await expect(row.getByText('2/4 passed — cannot go live')).toBeVisible();
});

test('Workflow page: ten steps with live status, step tags link to it', async ({ page }) => {
  await page.goto('/workflow');
  await expect(page.getByRole('heading', { level: 2, name: /Step \d+:/ })).toHaveCount(10);
  const step4 = page.locator('#step-4');
  await expect(step4).toContainText('Client approval');
  await expect(step4).toContainText(
    'Waiting on the client: FS-04 Departure, FS-12 Primary customer, FS-15 Price, FS-16 Seats',
  );
  await expect(page.getByRole('link', { name: /Source workflow \(Chinese\)/ })).toHaveAttribute(
    'href',
    'https://claude.ai/artifact/TpdZz945Dm6MVEvLeBNLFN',
  );

  await page.goto('/publish');
  await page.getByRole('link', { name: /^Workflow steps 7 · 8/ }).click();
  await expect(page).toHaveURL(/\/workflow#step-7$/);
  await expect(page.locator('#step-7')).toBeInViewport();
});

test('The PM confirms official-source facts with an expiry; product facts stay with the client', async ({
  page,
}) => {
  await page.goto('/fact-sheet');
  await expect(
    page.getByRole('row', { name: /FS-04/ }).getByRole('button', { name: /^Confirm/ }),
  ).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('row', { name: /FS-09/ }).getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByRole('checkbox', { name: /an expiry is required/ })).toBeDisabled();
  await page.getByLabel('Expires on').fill('2026-12-15');
  await page.getByRole('button', { name: 'Confirm FS-09' }).click();
  await expect(page.getByRole('row', { name: /FS-09/ })).toContainText('Jordan Reid');
});
