import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
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

  test('should show package list section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#package-list')).toBeVisible();
  });

  test('should show CI grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#ci-grid')).toBeVisible();
  });

  test('should show contribution graph', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#contribution-graph')).toBeAttached();
  });

  test('should show repo grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#repo-grid')).toBeAttached();
  });
});
