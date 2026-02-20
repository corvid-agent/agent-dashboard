import { test, expect, Page } from '@playwright/test';

/**
 * Mock all external API calls to prevent flaky tests from network dependencies.
 */
async function mockExternalAPIs(page: Page) {
  // Mock GitHub events API
  await page.route('**/api.github.com/users/corvid-agent/events/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '1',
          type: 'PushEvent',
          repo: { name: 'corvid-agent/retry' },
          created_at: new Date().toISOString(),
          payload: { commits: [{ sha: 'abc123', message: 'test commit' }], ref: 'refs/heads/main' },
        },
        {
          id: '2',
          type: 'CreateEvent',
          repo: { name: 'corvid-agent/env' },
          created_at: new Date().toISOString(),
          payload: { ref_type: 'branch', ref: 'feat/new' },
        },
      ]),
    }),
  );

  // Mock GitHub repos API (all repo list endpoints)
  await page.route('**/api.github.com/users/corvid-agent/repos**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          name: 'retry',
          html_url: 'https://github.com/corvid-agent/retry',
          description: 'Resilient retry utility',
          language: 'TypeScript',
          stargazers_count: 3,
          fork: false,
          pushed_at: new Date().toISOString(),
        },
        {
          name: 'env',
          html_url: 'https://github.com/corvid-agent/env',
          description: 'Typed environment variable loader',
          language: 'TypeScript',
          stargazers_count: 2,
          fork: false,
          pushed_at: new Date().toISOString(),
        },
        {
          name: 'agent-dashboard',
          html_url: 'https://github.com/corvid-agent/agent-dashboard',
          description: 'Operational dashboard',
          language: 'HTML',
          stargazers_count: 1,
          fork: false,
          pushed_at: new Date().toISOString(),
        },
      ]),
    }),
  );

  // Mock GitHub CI/actions API
  await page.route('**/api.github.com/repos/corvid-agent/*/actions/runs**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflow_runs: [
          {
            conclusion: 'success',
            updated_at: new Date().toISOString(),
          },
        ],
      }),
    }),
  );

  // Mock GitHub commit activity stats API
  await page.route('**/api.github.com/repos/corvid-agent/*/stats/commit_activity', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          week: Math.floor(Date.now() / 1000) - 7 * 86400,
          days: [2, 3, 1, 0, 4, 2, 1],
          total: 13,
        },
      ]),
    }),
  );

  // Mock GitHub rate limit (used for response time measurement)
  await page.route('**/api.github.com/rate_limit', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ resources: {} }),
    }),
  );

  // Mock Algorand wallet account API
  await page.route('**/mainnet-api.4160.nodely.dev/v2/accounts/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        amount: 12345678,
        'min-balance': 100000,
        assets: [{ 'asset-id': 1 }, { 'asset-id': 2 }],
        'apps-local-state': [],
        'created-apps': [{ id: 1 }],
      }),
    }),
  );

  // Mock Algorand network status API
  await page.route('**/mainnet-api.4160.nodely.dev/v2/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        'last-round': 48000000,
        'time-since-last-round': 3200000000,
        'catchup-time': 0,
        'next-version': 'https://github.com/algorandfoundation/specs/tree/v3.22',
      }),
    }),
  );

  // Mock npm registry ping
  await page.route('**/registry.npmjs.org/-/ping', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );

  // Mock Pages CDN ping
  await page.route('**/corvid-agent.github.io/', (route) => {
    // Only intercept the no-cors fetch used by measureResponseTimes, not page navigations
    if (route.request().resourceType() === 'fetch') {
      return route.fulfill({ status: 200, body: '' });
    }
    return route.continue();
  });

  // Mock Google Fonts to avoid network requests
  await page.route('**/fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
  await page.route('**/fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'font/woff2', body: '' }),
  );
}

test.describe('App loading and basic structure', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAPIs(page);
    await page.goto('/');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('corvid-agent | Status Dashboard');
  });

  test('header displays logo text', async ({ page }) => {
    const logo = page.locator('.logo');
    await expect(logo).toBeVisible();
    await expect(logo).toContainText('corvid-agent');
    await expect(logo).toContainText('dashboard');
  });

  test('status chip is visible and shows status', async ({ page }) => {
    const statusChip = page.locator('#status-chip');
    await expect(statusChip).toBeVisible();
    // Should eventually show "Operational" after API mocks resolve
    await expect(page.locator('#status-text')).toHaveText('Operational', { timeout: 10000 });
  });

  test('navigation links are present', async ({ page }) => {
    const nav = page.locator('.nav-links');
    await expect(nav).toBeVisible();

    // Check key nav links exist
    await expect(nav.locator('a', { hasText: 'Home' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'GitHub' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Explorer' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Profile' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Dashboard' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Chat' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Cinema' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Weather' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Space' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Apps' })).toBeVisible();
  });

  test('Dashboard nav link is marked active', async ({ page }) => {
    const dashboardLink = page.locator('.nav-links a.active');
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toContainText('Dashboard');
  });

  test('navigation links have correct hrefs', async ({ page }) => {
    await expect(page.locator('.nav-links a', { hasText: 'Home' })).toHaveAttribute(
      'href',
      'https://corvid-agent.github.io',
    );
    await expect(page.locator('.nav-links a', { hasText: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/corvid-agent',
    );
  });

  test('refresh button is visible', async ({ page }) => {
    const refreshBtn = page.locator('.refresh-btn');
    await expect(refreshBtn).toBeVisible();
    await expect(refreshBtn).toContainText('Refresh');
  });

  test('auto-refresh interval selector is present', async ({ page }) => {
    const select = page.locator('#interval-select');
    await expect(select).toBeVisible();
    // Check default options
    await expect(select.locator('option')).toHaveCount(4);
    await expect(select.locator('option[value="30"]')).toContainText('30s');
    await expect(select.locator('option[value="60"]')).toContainText('1m');
    await expect(select.locator('option[value="300"]')).toContainText('5m');
    await expect(select.locator('option[value="0"]')).toContainText('Off');
  });

  test('last-updated timestamp appears after load', async ({ page }) => {
    const lastUpdated = page.locator('#last-updated');
    await expect(lastUpdated).toBeVisible();
    // After refresh it should no longer say "Loading..."
    await expect(lastUpdated).not.toHaveText('Loading...', { timeout: 10000 });
  });

  test('footer is present with expected links', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('corvid-agent');
    await expect(footer).toContainText('Algorand');
    await expect(footer).toContainText('CorvidLabs');

    // Check footer navigation links
    await expect(footer.locator('a', { hasText: 'Home' })).toBeVisible();
    await expect(footer.locator('a', { hasText: 'Dashboard' })).toBeVisible();
    await expect(footer.locator('a', { hasText: 'Explorer' })).toBeVisible();
  });

  test('voice controls are present', async ({ page }) => {
    await expect(page.locator('#voice-toggle-btn')).toBeVisible();
    await expect(page.locator('#mic-btn')).toBeVisible();
  });

  test('dashboard grid container exists', async ({ page }) => {
    await expect(page.locator('.dashboard')).toBeVisible();
  });
});
