import { test, expect } from '@playwright/test';
import { removeAllBots } from './helpers';

test.beforeEach(async ({ request }) => {
  await removeAllBots(request);
});

test.describe('Navigation', () => {
  test('should default to orders page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/orders');
  });

  test('should switch between tabs', async ({ page }) => {
    await page.goto('/orders');

    await page.click('text=Bot 管理');
    await expect(page).toHaveURL('/bots');

    await page.click('text=我的订单');
    await expect(page).toHaveURL('/orders');
  });
});
