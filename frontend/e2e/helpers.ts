import { expect, type Page } from '@playwright/test';

export async function actAs(
  page: Page,
  role: 'PM' | 'Client approver' | 'Client decision maker' | 'Sales' | 'Executor',
) {
  await page.getByRole('combobox', { name: 'Acting role' }).click();
  await page.getByRole('option', { name: new RegExp(`^${role} ·`) }).click();
  await expect(page.getByRole('combobox', { name: 'Acting role' })).toContainText(role);
}

export async function pick(page: Page, label: string | RegExp, option: string | RegExp) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option }).click();
}
