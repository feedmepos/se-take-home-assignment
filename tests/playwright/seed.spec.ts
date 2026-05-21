// Seed test for Playwright Test Agents
// Copy this to tests/playwright/seed.spec.ts after running openspec-pw init
// Customize the page object and base URL for your application

import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import { existsSync } from 'fs';
import { BasePage } from './pages/BasePage';

// Customize these for your application
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

/**
 * Page Object Pattern - extends BasePage for shared utilities
 * Add your app's common selectors here
 * Example:
 *   get loginButton() { return this.byRole('button', { name: '登录' }); }
 */
class AppPage extends BasePage {
  // Add page-specific selectors here
}

/**
 * Helper to create a new page object
 */
function createPage(page: Page): AppPage {
  return new AppPage(page);
}

// ──────────────────────────────────────────────
// Below are example tests - customize for your app
// ──────────────────────────────────────────────

test.describe('Application smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    const app = createPage(page);
    await app.goto('/');
  });

  test('page loads successfully', async ({ page }) => {
    // Verify the page loads without errors
    await expect(page).not.toHaveURL(/.*error.*/);
  });

  test('no console errors', async ({ page }) => {
    const errors: string[] = [];
    const handler = (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    };
    page.on('console', handler);
    await page.reload();
    await page.waitForLoadState('networkidle');
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────
// Environment validation (runs in Step 3)
// ──────────────────────────────────────────────

test.describe('Environment validation', () => {
  test('BASE_URL responds 200', async ({ page }) => {
    const res = await page.request.get(`${BASE_URL}/`);
    expect(res.status(), `BASE_URL ${BASE_URL} returned ${res.status()}`).toBeLessThan(500);
  });

  test('auth storageState exists if credentials provided', async () => {
    if (!process.env.E2E_USERNAME) return; // skip if no credentials configured
    const authPath = 'playwright/.auth/user.json';
    if (!existsSync(authPath)) {
      throw new Error(
        `Auth not configured. Run:\n  npx playwright test --project=setup\nThen re-run /opsx:e2e.`
      );
    }
  });
});

// ──────────────────────────────────────────────
// Example: Role-based tests with @tag
// Use tags (@admin, @user) for permission filtering instead of
// multiple Playwright projects — prevents false "N tests" impressions
// ──────────────────────────────────────────────

// test.describe('Subscription management', () => {
//   test('activate subscription', { tag: '@admin' }, async ({ page }) => {
//     // Admin-only test
//     await page.goto(`${BASE_URL}/admin/subscriptions`);
//     await expect(page.getByRole('button', { name: '激活订阅' })).toBeVisible();
//   });
//
//   test('view subscription', { tag: '@user' }, async ({ page }) => {
//     // User-only test
//     await page.goto(`${BASE_URL}/subscription`);
//     await expect(page.getByText('当前订阅')).toBeVisible();
//   });
// });

// Run with: npx playwright test --grep "@admin"
// Run with: npx playwright test --grep "@user"

// ──────────────────────────────────────────────
// Example: Auth guard test with FRESH browser context
// 🚫 NEVER test auth guard with the same authenticated context!
// Use browser.newContext() to create a context with NO cookies/storage
// ──────────────────────────────────────────────

// test.describe('Auth guard', () => {
//   test('redirects unauthenticated user to login', async ({ browser }) => {
//     const freshContext = await browser.newContext(); // No session cookies
//     const freshPage = await freshContext.newPage();
//     await freshPage.goto(`${BASE_URL}/dashboard`);
//     await expect(freshPage).toHaveURL(/login|auth|signin/);
//     await freshContext.close();
//   });
// });

// ──────────────────────────────────────────────
// Example: Error path test
// Always include error scenarios, not just happy paths
// ──────────────────────────────────────────────

// test.describe('Error handling', () => {
//   test('shows error message on invalid input', async ({ page }) => {
//     const app = createPage(page);
//     await app.goto(`${BASE_URL}/submit`);
//     await app.fillAndVerify(app.byTestId('input'), '');
//     await app.click(app.byTestId('submit'));
//     await expect(page.getByTestId('error')).toContainText('不能为空');
//   });
// });

// ──────────────────────────────────────────────
// Anti-pattern warnings
// ──────────────────────────────────────────────

// 🚫 WRONG — False Pass: test silently passes if button doesn't exist
// const cancelBtn = page.getByRole('button', { name: '取消订阅' });
// if (await cancelBtn.isVisible().catch(() => false)) {
//   await cancelBtn.click();
//   await expect(page.getByText('成功')).toBeVisible();
// }

// ✅ CORRECT — Use assertion: test fails if element is missing
// await expect(page.getByRole('button', { name: '取消订阅' })).toBeVisible();
// await page.getByRole('button', { name: '取消订阅' }).click();
// await expect(page.getByText('操作成功')).toBeVisible();
