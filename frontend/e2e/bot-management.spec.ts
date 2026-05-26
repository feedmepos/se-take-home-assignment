import { test, expect } from '@playwright/test';
import {
  clearPendingOrders,
  createOrderViaUi,
  removeAllBots,
  waitForOrderStatus,
} from './helpers';

test.beforeEach(async ({ request }) => {
  await removeAllBots(request);
});

test.describe('Bot Management', () => {
  test('should add a bot', async ({ page }) => {
    await page.goto('/bots');

    const before = await page.locator('strong').count();

    await page.click('text=+ Bot');

    await expect(page.locator('strong').nth(before)).toBeVisible();
  });

  test('should remove the newest bot', async ({ page }) => {
    const botsLoaded = page.waitForResponse(
      (resp) => resp.url().includes('/api/bots') && resp.status() === 200,
    );
    await page.goto('/bots');
    await botsLoaded;

    await page.click('text=+ Bot');
    await expect(page.locator('strong')).toHaveCount(1);
    await page.click('text=+ Bot');
    await expect(page.locator('strong')).toHaveCount(2);
    await page.click('text=+ Bot');
    await expect(page.locator('strong')).toHaveCount(3);

    await page.click('text=- Bot');
    await expect(page.locator('strong')).toHaveCount(2);
  });

  test('should show processing status when handling order', async ({ page, request }) => {
    await clearPendingOrders(request);
    await page.goto('/orders');
    const orderId = await createOrderViaUi(page, 'NORMAL');

    await page.click('text=Bot 管理');
    await page.click('text=+ Bot');
    await waitForOrderStatus(request, orderId, 'PROCESSING');

    await expect(page.locator(`text=处理中: Order-${orderId}`)).toBeVisible();
    await expect(page.locator('text=PROCESSING').first()).toBeVisible();

    await waitForOrderStatus(request, orderId, 'COMPLETE');
    await expect(page.locator('text=IDLE').first()).toBeVisible();
  });

  test('should return order to PENDING when the only processing bot is removed', async ({
    page,
    request,
  }) => {
    await clearPendingOrders(request);
    await page.goto('/orders');
    const vipId = await createOrderViaUi(page, 'VIP');
    await createOrderViaUi(page, 'NORMAL');
    const vipName = `Order-${vipId}`;

    await page.click('text=Bot 管理');
    await page.click('text=+ Bot');
    await expect(page.locator(`text=处理中: ${vipName}`)).toBeVisible();
    await page.click('text=- Bot');

    await waitForOrderStatus(request, vipId, 'PENDING');

    const ordersLoaded = page.waitForResponse(
      (resp) => resp.url().includes('/api/orders') && resp.status() === 200,
    );
    await page.click('text=我的订单');
    await ordersLoaded;

    const pendingSection = page.locator('h2:has-text("PENDING")').locator('..');
    await expect(pendingSection.locator(`text=${vipName}`)).toBeVisible();
  });

  test('should re-dispatch order to idle bot when newest processing bot is removed', async ({
    page,
    request,
  }) => {
    await clearPendingOrders(request);
    await page.goto('/orders');
    const firstNormalId = await createOrderViaUi(page, 'NORMAL');
    const secondNormalId = await createOrderViaUi(page, 'NORMAL');

    await page.click('text=Bot 管理');
    await page.click('text=+ Bot');
    await waitForOrderStatus(request, firstNormalId, 'PROCESSING');
    await page.click('text=+ Bot');
    await waitForOrderStatus(request, secondNormalId, 'PROCESSING');

    // 在第二个订单完成前移除 bot，避免两个订单同时结束导致无法验证重新调度
    await page.waitForTimeout(2_000);
    await page.click('text=- Bot');

    await expect
      .poll(async () => {
        const orders: { id: number; status: string }[] = await (
          await request.get('http://127.0.0.1:3000/api/orders')
        ).json();
        return orders.find((o) => o.id === secondNormalId)?.status;
      })
      .toMatch(/^(PENDING|PROCESSING)$/);

    await waitForOrderStatus(request, firstNormalId, 'COMPLETE');
    await waitForOrderStatus(request, secondNormalId, 'PROCESSING');

    const orderName = `Order-${secondNormalId}`;
    const ordersLoaded = page.waitForResponse(
      (resp) => resp.url().includes('/api/orders') && resp.status() === 200,
    );
    await page.click('text=我的订单');
    await ordersLoaded;

    const pendingSection = page.locator('h2:has-text("PENDING")').locator('..');
    await expect(pendingSection.locator(`text=${orderName}`)).toBeVisible();

    await page.click('text=Bot 管理');
    await expect(page.locator(`text=处理中: ${orderName}`)).toBeVisible();
  });
});
