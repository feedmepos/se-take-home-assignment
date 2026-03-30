import { test, expect } from '@playwright/test';

test.describe('订单排序与去重', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="action-bar"]')).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => fetch('/api/v1/reset', { method: 'DELETE' }).then(() => new Promise(r => setTimeout(r, 300))));
    await expect(page.locator('.order-card')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('.bot-item')).toHaveCount(0, { timeout: 3000 });
  });

  test('多个普通订单按编号升序排列', async ({ page }) => {
    // 创建 3 个普通订单
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-new-normal"]');

    const pendingCol = page.locator('[data-testid="column-pending"]');
    await expect(pendingCol.locator('.order-card')).toHaveCount(3, { timeout: 5000 });
  });

  test('VIP 卡片有星标图标', async ({ page }) => {
    // 创建 VIP + 普通订单
    await page.click('[data-testid="btn-new-vip"]');
    await page.click('[data-testid="btn-new-normal"]');

    const pendingCol = page.locator('[data-testid="column-pending"]');
    await expect(pendingCol.locator('.order-card')).toHaveCount(2, { timeout: 5000 });

    // VIP 卡片应有 vip-glow 类
    await expect(pendingCol.locator('.order-card.vip-glow')).toHaveCount(1, { timeout: 3000 });
  });

  test('快速添加订单不产生重复', async ({ page }) => {
    // 快速连续创建 5 个普通订单
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="btn-new-normal"]');
    }
    await page.waitForTimeout(500);

    // 恰好 5 张（不重复）
    const pendingCol = page.locator('[data-testid="column-pending"]');
    await expect(pendingCol.locator('.order-card')).toHaveCount(5, { timeout: 5000 });
  });

  test('订单卡片时间不包含 Invalid Date', async ({ page }) => {
    await page.click('[data-testid="btn-new-normal"]');

    const pendingCol = page.locator('[data-testid="column-pending"]');
    await expect(pendingCol.locator('.order-card')).toHaveCount(1, { timeout: 5000 });

    // 不包含 Invalid Date / null / undefined
    const allText = await pendingCol.locator('.order-card').textContent();
    expect(allText).not.toContain('Invalid Date');
    expect(allText).not.toContain('null');
    expect(allText).not.toContain('undefined');
  });

  test('已完成订单按完成时间倒序排列（最新在前）', async ({ page }) => {
    // 添加 2 个 Bot 以并行处理
    await page.click('[data-testid="btn-add-bot"]');
    await page.click('[data-testid="btn-add-bot"]');

    // 创建 2 个订单，它们会被 2 个 Bot 同时处理
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-new-normal"]');

    // 等待全部完成
    const completeCol = page.locator('[data-testid="column-complete"]');
    await expect(completeCol.locator('.order-card')).toHaveCount(2, { timeout: 15_000 });

    // 验证已完成列中订单按 data-testid 的 ID 排列
    const ids = await completeCol.locator('.order-card').evaluateAll(
      (els) => els.map((el) => el.getAttribute('data-testid')?.replace('order-card-', '') || ''),
    );
    // 后创建的订单 ID 更大，应该在前面
    expect(Number(ids[0])).toBeGreaterThan(Number(ids[1]));
  });
});
