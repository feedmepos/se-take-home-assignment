import { test, expect } from '@playwright/test';
import { clearPendingOrders, createOrderViaUi, removeAllBots } from './helpers';

test.beforeEach(async ({ request }) => {
  await removeAllBots(request);
});

test.describe('Order Flow', () => {
  test('should create Normal order and see it in PENDING', async ({ page }) => {
    await page.goto('/orders');
    await page.click('text=New Normal Order');

    const pendingSection = page.locator('h2:has-text("PENDING")').locator('..');
    await expect(pendingSection.locator('text=NORMAL').first()).toBeVisible();
  });

  test('should create VIP order placed before Normal orders', async ({ page, request }) => {
    await clearPendingOrders(request);
    await page.goto('/orders');
    const normalA = await createOrderViaUi(page, 'NORMAL');
    const normalB = await createOrderViaUi(page, 'NORMAL');
    const vipId = await createOrderViaUi(page, 'VIP');

    const orders: { id: number; type: string; status: string }[] = await (
      await request.get('http://127.0.0.1:3000/api/orders')
    ).json();
    const pendingIds = orders
      .filter((o) => o.status !== 'COMPLETE')
      .map((o) => o.id);

    expect(pendingIds.indexOf(vipId)).toBeLessThan(pendingIds.indexOf(normalA));
    expect(pendingIds.indexOf(vipId)).toBeLessThan(pendingIds.indexOf(normalB));
  });

  test('should complete order after bot processes it', async ({ page, request }) => {
    await clearPendingOrders(request);
    await page.goto('/orders');
    const orderId = await createOrderViaUi(page, 'NORMAL');
    const orderName = `Order-${orderId}`;

    await page.click('text=Bot 管理');
    await page.click('text=+ Bot');

    const ordersLoaded = page.waitForResponse(
      (resp) => resp.url().includes('/api/orders') && resp.status() === 200,
    );
    await page.click('text=我的订单');
    await ordersLoaded;

    const completeSection = page.locator('h2:has-text("COMPLETE")').locator('..');
    await expect
      .poll(async () => {
        const orders: { id: number; status: string }[] = await (
          await request.get('http://127.0.0.1:3000/api/orders')
        ).json();
        return orders.find((o) => o.id === orderId)?.status;
      }, { timeout: 20_000 })
      .toBe('COMPLETE');
    await expect(completeSection.locator(`text=${orderName}`)).toBeVisible();
  });

  test('should show completed timestamp in COMPLETE area', async ({ page, request }) => {
    await clearPendingOrders(request);
    await page.goto('/orders');
    const orderId = await createOrderViaUi(page, 'NORMAL');
    const orderName = `Order-${orderId}`;

    await page.click('text=Bot 管理');
    await page.click('text=+ Bot');

    const ordersLoaded = page.waitForResponse(
      (resp) => resp.url().includes('/api/orders') && resp.status() === 200,
    );
    await page.click('text=我的订单');
    await ordersLoaded;

    const completeSection = page.locator('h2:has-text("COMPLETE")').locator('..');
    await expect
      .poll(async () => {
        const orders: { id: number; status: string }[] = await (
          await request.get('http://127.0.0.1:3000/api/orders')
        ).json();
        return orders.find((o) => o.id === orderId)?.status;
      }, { timeout: 20_000 })
      .toBe('COMPLETE');
    await expect(completeSection.locator(`text=${orderName}`)).toBeVisible();
    await expect(completeSection.locator('text=/完成于/').first()).toBeVisible();
  });
});
