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
          payload: {
            commits: [{ sha: 'abc123', message: 'fix: improve retry logic' }],
            ref: 'refs/heads/main',
          },
        },
        {
          id: '2',
          type: 'CreateEvent',
          repo: { name: 'corvid-agent/env' },
          created_at: new Date().toISOString(),
          payload: { ref_type: 'branch', ref: 'feat/typed-env' },
        },
        {
          id: '3',
          type: 'PullRequestEvent',
          repo: { name: 'corvid-agent/chronos' },
          created_at: new Date().toISOString(),
          payload: {
            action: 'opened',
            number: 42,
            pull_request: {
              html_url: 'https://github.com/corvid-agent/chronos/pull/42',
            },
          },
        },
      ]),
    }),
  );

  // Mock GitHub repos API
  await page.route('**/api.github.com/users/corvid-agent/repos**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          name: 'retry',
          html_url: 'https://github.com/corvid-agent/retry',
          description: 'Resilient retry utility for async operations',
          language: 'TypeScript',
          stargazers_count: 5,
          fork: false,
          pushed_at: '2026-02-18T10:00:00Z',
        },
        {
          name: 'env',
          html_url: 'https://github.com/corvid-agent/env',
          description: 'Typed environment variable loader',
          language: 'TypeScript',
          stargazers_count: 3,
          fork: false,
          pushed_at: '2026-02-17T14:00:00Z',
        },
        {
          name: 'agent-dashboard',
          html_url: 'https://github.com/corvid-agent/agent-dashboard',
          description: 'Live operational status dashboard',
          language: 'HTML',
          stargazers_count: 1,
          fork: false,
          pushed_at: '2026-02-19T08:00:00Z',
        },
        {
          name: 'forked-lib',
          html_url: 'https://github.com/corvid-agent/forked-lib',
          description: 'A forked library',
          language: 'JavaScript',
          stargazers_count: 0,
          fork: true,
          pushed_at: '2026-01-10T12:00:00Z',
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
          days: [2, 5, 1, 0, 4, 3, 1],
          total: 16,
        },
      ]),
    }),
  );

  // Mock GitHub rate limit
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

  // Mock Pages CDN ping (only for fetch requests, not page navigation)
  await page.route('**/corvid-agent.github.io/', (route) => {
    if (route.request().resourceType() === 'fetch') {
      return route.fulfill({ status: 200, body: '' });
    }
    return route.continue();
  });

  // Mock Google Fonts
  await page.route('**/fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
  await page.route('**/fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'font/woff2', body: '' }),
  );
}

test.describe('Stats Cards', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAPIs(page);
    await page.goto('/');
  });

  test('displays four stat cards', async ({ page }) => {
    const statCards = page.locator('.panel.stat-card');
    await expect(statCards).toHaveCount(4);
  });

  test('Packages stat card shows count and badge', async ({ page }) => {
    const packagesCard = page.locator('.panel.stat-card.area-stat1');
    await expect(packagesCard).toBeVisible();
    await expect(packagesCard.locator('.panel-title')).toHaveText('Packages');
    await expect(packagesCard.locator('.panel-badge')).toHaveText('live');
    await expect(packagesCard.locator('#stat-packages')).toHaveText('5');
    await expect(packagesCard.locator('.stat-change')).toContainText('all published');
  });

  test('Tests stat card shows passing status', async ({ page }) => {
    const testsCard = page.locator('.panel.stat-card.area-stat2');
    await expect(testsCard).toBeVisible();
    await expect(testsCard.locator('.panel-title')).toHaveText('Tests');
    await expect(testsCard.locator('.panel-badge')).toHaveText('passing');
    await expect(testsCard.locator('#stat-tests')).toHaveText('5/5');
    await expect(testsCard.locator('.stat-change')).toContainText('all passing');
  });

  test('GitHub Repos stat card populates from API', async ({ page }) => {
    const reposCard = page.locator('.panel.stat-card.area-stat3');
    await expect(reposCard).toBeVisible();
    await expect(reposCard.locator('.panel-title')).toHaveText('GitHub Repos');
    await expect(reposCard.locator('.panel-badge')).toHaveText('org');
    // After mock API resolves, should show repo count
    await expect(page.locator('#stat-repos')).toHaveText('4', { timeout: 10000 });
    await expect(page.locator('#stat-repos-detail')).toContainText('owned', { timeout: 10000 });
  });

  test('ALGO Balance stat card populates from API', async ({ page }) => {
    const balanceCard = page.locator('.panel.stat-card.area-stat4');
    await expect(balanceCard).toBeVisible();
    await expect(balanceCard.locator('.panel-title')).toHaveText('ALGO Balance');
    await expect(balanceCard.locator('.panel-badge')).toHaveText('mainnet');
    // 12345678 microAlgo = 12.345678 ALGO, displayed as 12.346 in stat card
    await expect(page.locator('#stat-balance')).toHaveText('12.346', { timeout: 10000 });
    await expect(page.locator('#stat-balance-detail')).toHaveText('ALGO', { timeout: 10000 });
  });
});

test.describe('Package Health Panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAPIs(page);
    await page.goto('/');
  });

  test('panel header shows title and badge', async ({ page }) => {
    const panel = page.locator('.panel.area-packages');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel-title')).toHaveText('Package Health');
    await expect(panel.locator('.panel-badge')).toHaveText('all healthy');
  });

  test('displays all five packages', async ({ page }) => {
    const packageRows = page.locator('#package-list .package-row');
    await expect(packageRows).toHaveCount(5);
  });

  test('each package has name, version, and status', async ({ page }) => {
    const packages = [
      '@corvid-agent/retry',
      '@corvid-agent/env',
      '@corvid-agent/chronos',
      '@corvid-agent/pipe',
      '@corvid-agent/throttle',
    ];

    for (const pkgName of packages) {
      const row = page.locator('.package-row', { has: page.locator('.pkg-name', { hasText: pkgName }) });
      await expect(row).toBeVisible();
      await expect(row.locator('.pkg-version')).toHaveText('v1.0.0');
      await expect(row.locator('.pkg-tests')).toHaveText('passing');
      await expect(row.locator('.status-indicator.ok')).toBeVisible();
    }
  });
});

test.describe('CI / Build Status Panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAPIs(page);
    await page.goto('/');
  });

  test('panel header shows title', async ({ page }) => {
    const panel = page.locator('.panel.area-cistat');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel-title')).toHaveText('CI / Build Status');
  });

  test('CI grid populates with repo statuses', async ({ page }) => {
    // Wait for CI items to appear (replaces loading text)
    await expect(page.locator('#ci-grid .ci-item').first()).toBeVisible({ timeout: 15000 });

    // Should have multiple CI items
    const ciItems = page.locator('#ci-grid .ci-item');
    const count = await ciItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('CI items have status dot, repo link, and time', async ({ page }) => {
    await expect(page.locator('#ci-grid .ci-item').first()).toBeVisible({ timeout: 15000 });

    const firstItem = page.locator('#ci-grid .ci-item').first();
    await expect(firstItem.locator('.ci-dot')).toBeVisible();
    await expect(firstItem.locator('a')).toBeVisible();
    await expect(firstItem.locator('.ci-time')).toBeVisible();
  });

  test('CI badge updates after loading', async ({ page }) => {
    const badge = page.locator('#ci-badge');
    // Should eventually show passing count (not "loading")
    await expect(badge).not.toHaveText('loading', { timeout: 15000 });
    await expect(badge).toContainText('passing');
  });
});

test.describe('Contribution Graph Panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAPIs(page);
    await page.goto('/');
  });

  test('panel header shows title', async ({ page }) => {
    const panel = page.locator('.panel.area-commits');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel-title')).toHaveText('Contribution Graph');
  });

  test('contribution graph SVG renders', async ({ page }) => {
    await expect(page.locator('#contribution-graph svg')).toBeVisible({ timeout: 15000 });
  });

  test('contribution graph has cells', async ({ page }) => {
    await expect(page.locator('#contribution-graph svg')).toBeVisible({ timeout: 15000 });
    const cells = page.locator('#contribution-graph .contrib-cell');
    const count = await cells.count();
    // Should have ~364 cells for a year
    expect(count).toBeGreaterThan(100);
  });

  test('commit count badge updates', async ({ page }) => {
    const badge = page.locator('#commit-count-badge');
    await expect(badge).not.toHaveText('loading', { timeout: 15000 });
    await expect(badge).toContainText('commits');
  });

  test('graph legend is present', async ({ page }) => {
    await expect(page.locator('#contribution-graph svg')).toBeVisible({ timeout: 15000 });
    const legend = page.locator('#contribution-graph .graph-legend');
    await expect(legend).toBeVisible();
    await expect(legend).toContainText('Less');
    await expect(legend).toContainText('More');
    // Should have color swatches
    const swatches = legend.locator('.swatch');
    await expect(swatches).toHaveCount(5);
  });
});

test.describe('GitHub Activity Feed', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAPIs(page);
    await page.goto('/');
  });

  test('panel header shows title and badge', async ({ page }) => {
    const panel = page.locator('.panel.area-activity');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel-title')).toHaveText('Live Activity');
    await expect(panel.locator('.panel-badge')).toHaveText('github events');
  });

  test('activity log entries appear from mock data', async ({ page }) => {
    await expect(page.locator('#activity-log .log-entry').first()).toBeVisible({ timeout: 10000 });

    const entries = page.locator('#activity-log .log-entry');
    const count = await entries.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('activity entries have timestamp, icon, and description', async ({ page }) => {
    await expect(page.locator('#activity-log .log-entry').first()).toBeVisible({ timeout: 10000 });

    const firstEntry = page.locator('#activity-log .log-entry').first();
    await expect(firstEntry.locator('.log-time')).toBeVisible();
    await expect(firstEntry.locator('.log-icon')).toBeVisible();
    await expect(firstEntry.locator('.log-text')).toBeVisible();
  });

  test('push event is rendered with commit info', async ({ page }) => {
    await expect(page.locator('#activity-log .log-entry').first()).toBeVisible({ timeout: 10000 });
    // The PushEvent should mention "Pushed" and the repo
    await expect(page.locator('#activity-log .log-text').first()).toContainText('Pushed');
    await expect(page.locator('#activity-log .log-text').first()).toContainText('retry');
  });
});

test.describe('Algorand Wallet Panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAPIs(page);
    await page.goto('/');
  });

  test('panel header shows title and badge', async ({ page }) => {
    const panel = page.locator('.panel.area-wallet');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel-title')).toHaveText('Agent Wallet');
    await expect(panel.locator('.panel-badge')).toHaveText('algorand mainnet');
  });

  test('wallet address is displayed with link', async ({ page }) => {
    const walletLink = page.locator('#wallet-link');
    await expect(walletLink).toBeVisible();
    await expect(walletLink).toContainText('WGSHC4');
    await expect(walletLink).toHaveAttribute('href', /allo\.info\/account/);
  });

  test('balance populates from mock API', async ({ page }) => {
    // 12345678 microAlgo = 12.345678 ALGO
    await expect(page.locator('#wallet-balance')).toContainText('12.345678 ALGO', { timeout: 10000 });
  });

  test('min-balance populates from mock API', async ({ page }) => {
    // 100000 microAlgo = 0.100000 ALGO
    await expect(page.locator('#wallet-min-balance')).toContainText('0.100000 ALGO', { timeout: 10000 });
  });

  test('assets count populates from mock API', async ({ page }) => {
    // 2 ASAs, 1 created-app = "2 ASAs, 1 apps"
    await expect(page.locator('#wallet-assets')).toContainText('2 ASAs', { timeout: 10000 });
  });

  test('protocol link is visible', async ({ page }) => {
    const protocolRow = page.locator('.chain-stat', { hasText: 'Protocol' });
    await expect(protocolRow).toBeVisible();
    await expect(protocolRow.locator('a')).toContainText('AlgoChat');
  });
});

test.describe('Algorand Network Panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAPIs(page);
    await page.goto('/');
  });

  test('panel header shows title', async ({ page }) => {
    const panel = page.locator('.panel.area-network');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel-title')).toHaveText('Algorand Network');
  });

  test('network stats populate from mock API', async ({ page }) => {
    // 48000000 formatted = "48.00M"
    await expect(page.locator('#net-round')).toContainText('48', { timeout: 10000 });
    await expect(page.locator('#net-round-time')).toContainText('3.2s', { timeout: 10000 });
    await expect(page.locator('#net-catchup')).toHaveText('Synced', { timeout: 10000 });
    await expect(page.locator('#net-version')).toContainText('v3.22', { timeout: 10000 });
  });

  test('network badge updates to synced', async ({ page }) => {
    await expect(page.locator('#network-badge')).toHaveText('synced', { timeout: 10000 });
  });

  test('network stat grid has four items', async ({ page }) => {
    const items = page.locator('.network-stat-item');
    await expect(items).toHaveCount(4);

    // Check labels
    await expect(items.nth(0).locator('.network-stat-label')).toHaveText('Latest Round');
    await expect(items.nth(1).locator('.network-stat-label')).toHaveText('Round Time');
    await expect(items.nth(2).locator('.network-stat-label')).toHaveText('Catchup Time');
    await expect(items.nth(3).locator('.network-stat-label')).toHaveText('Next Version');
  });
});

test.describe('Uptime & Response Times Panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAPIs(page);
    await page.goto('/');
  });

  test('panel header shows title and badge', async ({ page }) => {
    const panel = page.locator('.panel.area-uptime');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel-title')).toContainText('Uptime');
    await expect(panel.locator('.panel-badge')).toHaveText('monitoring');
  });

  test('uptime rows are displayed for each service', async ({ page }) => {
    const uptimeRows = page.locator('.uptime-row');
    await expect(uptimeRows).toHaveCount(4);

    await expect(uptimeRows.nth(0).locator('.uptime-label')).toHaveText('CI/CD');
    await expect(uptimeRows.nth(1).locator('.uptime-label')).toHaveText('Packages');
    await expect(uptimeRows.nth(2).locator('.uptime-label')).toHaveText('AlgoChat');
    await expect(uptimeRows.nth(3).locator('.uptime-label')).toHaveText('Agent');
  });

  test('uptime bars are rendered', async ({ page }) => {
    // Each uptime row should have bars rendered by JS
    const ciBars = page.locator('#uptime-cicd .uptime-bar');
    // renderUptime creates 30 bars per service
    await expect(ciBars).toHaveCount(30);
  });

  test('uptime percentages are shown', async ({ page }) => {
    const pcts = page.locator('.uptime-pct');
    await expect(pcts).toHaveCount(4);
    // All should contain a % sign
    for (let i = 0; i < 4; i++) {
      await expect(pcts.nth(i)).toContainText('%');
    }
  });

  test('response times section appears after API calls', async ({ page }) => {
    const responseTimes = page.locator('#response-times');
    await expect(responseTimes).toBeVisible();
    // Should have response items for each endpoint
    await expect(responseTimes.locator('.resp-item').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Organization Repositories Panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAPIs(page);
    await page.goto('/');
  });

  test('panel header shows title', async ({ page }) => {
    const panel = page.locator('.panel.area-repos');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel-title')).toHaveText('Organization Repositories');
  });

  test('repo cards are rendered from mock data', async ({ page }) => {
    await expect(page.locator('#repo-grid .repo-card').first()).toBeVisible({ timeout: 10000 });
    const cards = page.locator('#repo-grid .repo-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('repo cards have name, description, and metadata', async ({ page }) => {
    await expect(page.locator('#repo-grid .repo-card').first()).toBeVisible({ timeout: 10000 });

    const retryCard = page.locator('.repo-card', { hasText: 'retry' }).first();
    await expect(retryCard).toBeVisible();
    await expect(retryCard.locator('.repo-card-name')).toHaveText('retry');
    await expect(retryCard.locator('.repo-card-desc')).toContainText('Resilient retry');
    await expect(retryCard.locator('.repo-card-meta')).toContainText('TypeScript');
  });

  test('repo count badge updates', async ({ page }) => {
    const badge = page.locator('#repo-count-badge');
    await expect(badge).not.toHaveText('loading', { timeout: 10000 });
    await expect(badge).toContainText('source repos');
  });

  test('repo cards link to GitHub', async ({ page }) => {
    await expect(page.locator('#repo-grid .repo-card').first()).toBeVisible({ timeout: 10000 });

    const firstCard = page.locator('#repo-grid .repo-card').first();
    await expect(firstCard).toHaveAttribute('href', /github\.com\/corvid-agent/);
    await expect(firstCard).toHaveAttribute('target', '_blank');
  });
});
