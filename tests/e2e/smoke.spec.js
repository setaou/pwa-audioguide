import { test, expect } from '@playwright/test';

test('app shell loads fixture configuration', async ({ page }) => {
  await page.goto('/index.html?config=tests/fixtures/config.yml');
  await expect(page).toHaveTitle(/Audioguide/);
  await expect(page.locator('#view-home')).toBeVisible();
  await expect(page.locator('#monument-title')).toContainText('Monument Fictif de Test');
});
