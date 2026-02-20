import { test, expect } from '@playwright/test';

test.describe('App', () => {
  test.beforeEach(async ({ page }) => {
    // Mock external APIs
    await page.route('**/api.github.com/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );
    await page.route('**/mainnet-api.algonode.cloud/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ amount: 1000000, assets: [] }) })
    );
    await page.route('**/registry.npmjs.org/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
  });

  test('should load page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Status Dashboard/i);
  });

  test('should show header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.header')).toBeVisible();
  });

  test('should show dashboard grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.dashboard')).toBeVisible();
  });

  test('should show stat cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.stat-card').first()).toBeVisible();
  });
});
