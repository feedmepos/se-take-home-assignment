import { test, expect } from '@playwright/test';

test.describe('VIP 优先级', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="action-bar"]')).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => fetch('/api/v1/reset', { method: 'DELETE' }).then(() => new Promise(r => setTimeout(r, 300))));
    await expect(page.locator('.order-card')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('.bot-item')).toHaveCount(0, { timeout: 3000 });
  });

  test('VIP 订单优先于普通订单被处理（不重复）', async ({ page }) => {
    // 创建普通订单 + VIP 订单
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-new-vip"]');

    // 待处理列恰好 2 个订单（不重复）
    const pendingCol = page.locator('[data-testid="column-pending"]');
    await expect(pendingCol.locator('.order-card')).toHaveCount(2, { timeout: 5000 });

    // 添加 Bot
    await page.click('[data-testid="btn-add-bot"]');

    // 处理中恰好 1 个订单（VIP 先被取走，不重复）
    const processingCol = page.locator('[data-testid="column-processing"]');
    await expect(processingCol.locator('.order-card')).toHaveCount(1, { timeout: 5000 });

    // VIP 卡片应有金色标识
    const vipCard = processingCol.locator('.order-card.vip-glow');
    await expect(vipCard).toHaveCount(1, { timeout: 3000 });

    // 待处理列剩 1 个（普通订单）
    await expect(pendingCol.locator('.order-card')).toHaveCount(1, { timeout: 3000 });
  });

  test('多个订单中 VIP 始终优先', async ({ page }) => {
    // 创建 2 个普通 + 1 个 VIP
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-new-vip"]');

    // 总共 3 个待处理（不重复）
    const pendingCol = page.locator('[data-testid="column-pending"]');
    await expect(pendingCol.locator('.order-card')).toHaveCount(3, { timeout: 5000 });

    // 添加 Bot → VIP 先被取走
    await page.click('[data-testid="btn-add-bot"]');

    const processingCol = page.locator('[data-testid="column-processing"]');
    await expect(processingCol.locator('.order-card')).toHaveCount(1, { timeout: 5000 });

    // 正在处理的是 VIP 订单
    const vipCard = processingCol.locator('.order-card.vip-glow');
    await expect(vipCard).toHaveCount(1, { timeout: 3000 });
  });
});
