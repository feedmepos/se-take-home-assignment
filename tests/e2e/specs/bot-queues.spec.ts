import { test, expect } from '@playwright/test';

test.describe('Bot 队列展示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="action-bar"]')).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => fetch('/api/v1/reset', { method: 'DELETE' }).then(() => new Promise(r => setTimeout(r, 300))));
    await expect(page.locator('.order-card')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('.bot-item')).toHaveCount(0, { timeout: 3000 });
  });

  test('空闲和工作队列并排显示', async ({ page }) => {
    // 添加 2 个 Bot
    await page.click('[data-testid="btn-add-bot"]');
    await page.click('[data-testid="btn-add-bot"]');

    const botPanel = page.locator('[data-testid="bot-panel"]');

    // 验证两个队列容器都存在
    const idleQueue = botPanel.locator('[data-testid="bot-idle-queue"]');
    const busyQueue = botPanel.locator('[data-testid="bot-busy-queue"]');
    await expect(idleQueue).toBeVisible({ timeout: 3000 });
    await expect(busyQueue).toBeVisible({ timeout: 3000 });

    // 面板中恰好 2 个 Bot（不重复，无订单时均在空闲）
    await expect(botPanel.locator('.bot-item')).toHaveCount(2, { timeout: 5000 });
  });

  test('Bot 接单后正确移动队列', async ({ page }) => {
    // 创建订单并添加 Bot
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-add-bot"]');

    // Bot 从空闲移到工作中（恰好 1 个，不重复）
    const busyQueue = page.locator('[data-testid="bot-busy-queue"]');
    await expect(busyQueue.locator('.bot-item')).toHaveCount(1, { timeout: 5000 });

    // 空闲队列为空
    const idleQueue = page.locator('[data-testid="bot-idle-queue"]');
    await expect(idleQueue.locator('.bot-item')).toHaveCount(0, { timeout: 3000 });
  });

  test('队列标题显示 Bot 数量', async ({ page }) => {
    // 添加 3 个 Bot
    await page.click('[data-testid="btn-add-bot"]');
    await page.click('[data-testid="btn-add-bot"]');
    await page.click('[data-testid="btn-add-bot"]');

    // 验证空闲队列标题显示数量 (3)
    const idleQueue = page.locator('[data-testid="bot-idle-queue"]');
    await expect(idleQueue.locator('.queue-count')).toContainText('3', { timeout: 5000 });
  });

  test('Bot 显示正确的编号格式 #N', async ({ page }) => {
    // 添加 2 个 Bot
    await page.click('[data-testid="btn-add-bot"]');
    await page.click('[data-testid="btn-add-bot"]');

    const botPanel = page.locator('[data-testid="bot-panel"]');

    // 等待 Bot 出现
    await expect(botPanel.locator('.bot-item')).toHaveCount(2, { timeout: 5000 });

    // 验证 Bot 编号显示为 #1, #2 格式
    const botIds = botPanel.locator('.bot-id');
    const texts = await botIds.allTextContents();
    expect(texts.length).toBe(2);
    expect(texts[0]).toMatch(/^#\d+$/);
    expect(texts[1]).toMatch(/^#\d+$/);
  });

  test('连续添加 Bot 不产生重复', async ({ page }) => {
    // 连续快速添加 3 个 Bot
    await page.click('[data-testid="btn-add-bot"]');
    await page.click('[data-testid="btn-add-bot"]');
    await page.click('[data-testid="btn-add-bot"]');

    // 总共恰好 3 个（不重复）
    const botPanel = page.locator('[data-testid="bot-panel"]');
    await expect(botPanel.locator('.bot-item')).toHaveCount(3, { timeout: 5000 });
  });
});
