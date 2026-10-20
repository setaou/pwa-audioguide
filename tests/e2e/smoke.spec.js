import { test, expect } from '@playwright/test';

test('app shell loads successfully', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/Audioguide/);
  await expect(page.locator('#view-home')).toBeVisible();
  await expect(page.locator('#monument-title')).toContainText('Cathédrale Saint-Gatien');
});
