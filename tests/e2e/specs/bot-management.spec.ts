import { test, expect } from '@playwright/test';

test.describe('Bot 管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="action-bar"]')).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => fetch('/api/v1/reset', { method: 'DELETE' }).then(() => new Promise(r => setTimeout(r, 300))));
    await expect(page.locator('.order-card')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('.bot-item')).toHaveCount(0, { timeout: 3000 });
  });

  test('添加 Bot 后出现在空闲队列（不重复）', async ({ page }) => {
    await page.click('[data-testid="btn-add-bot"]');

    // Bot 无订单可处理时进入空闲队列（恰好 1 个，不重复）
    const botPanel = page.locator('[data-testid="bot-panel"]');
    await expect(botPanel.locator('.bot-item')).toHaveCount(1, { timeout: 5000 });
  });

  test('Bot 接单后从空闲队列移到工作中（不重复）', async ({ page }) => {
    // 先创建订单再添加 Bot（确保 Bot 立即接单）
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-add-bot"]');

    // Bot 应在工作队列（恰好 1 个，不重复）
    const busyQueue = page.locator('[data-testid="bot-busy-queue"]');
    await expect(busyQueue.locator('.bot-item')).toHaveCount(1, { timeout: 5000 });

    // 空闲队列为空
    const idleQueue = page.locator('[data-testid="bot-idle-queue"]');
    await expect(idleQueue.locator('.bot-item')).toHaveCount(0, { timeout: 3000 });
  });

  test('Bot 完成订单后回到空闲队列（不重复）', async ({ page }) => {
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-add-bot"]');

    // 等待处理完成（10 秒），Bot 回到空闲
    const botPanel = page.locator('[data-testid="bot-panel"]');
    await expect(botPanel.locator('.bot-item')).toHaveCount(1, { timeout: 15_000 });
  });

  test('Bot 销毁后从列表消失', async ({ page }) => {
    await page.click('[data-testid="btn-add-bot"]');
    await page.click('[data-testid="btn-add-bot"]');

    const botPanel = page.locator('[data-testid="bot-panel"]');
    await expect(botPanel.locator('.bot-item')).toHaveCount(2, { timeout: 5000 });

    // 移除 Bot
    await page.click('[data-testid="btn-remove-bot"]');

    // 恰好剩 1 个（不重复）
    await expect(botPanel.locator('.bot-item')).toHaveCount(1, { timeout: 5000 });
  });

  test('销毁工作中的 Bot → 订单回退到待处理（不重复）', async ({ page }) => {
    // 创建 2 个订单 + 1 个 Bot
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-add-bot"]');

    // Bot 接走第一个订单
    const busyQueue = page.locator('[data-testid="bot-busy-queue"]');
    await expect(busyQueue.locator('.bot-item')).toHaveCount(1, { timeout: 5000 });

    // 还有 1 个待处理订单
    const pendingCol = page.locator('[data-testid="column-pending"]');
    await expect(pendingCol.locator('.order-card')).toHaveCount(1, { timeout: 3000 });

    // 移除 Bot → 订单回退
    await page.click('[data-testid="btn-remove-bot"]');

    // 所有订单回到待处理（恰好 2 个，不重复）
    await expect(pendingCol.locator('.order-card')).toHaveCount(2, { timeout: 5000 });
  });

  test('VIP 订单被 Bot 处理时销毁 Bot → 回退后仍为 VIP 图标', async ({ page }) => {
    // 创建普通订单 + VIP 订单
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-new-vip"]');

    // 添加 Bot → VIP 先被取走
    await page.click('[data-testid="btn-add-bot"]');

    const processingCol = page.locator('[data-testid="column-processing"]');
    await expect(processingCol.locator('.order-card')).toHaveCount(1, { timeout: 5000 });

    // 处理中的是 VIP 订单（有 vip-glow 类）
    await expect(processingCol.locator('.order-card.vip-glow')).toHaveCount(1, { timeout: 3000 });

    // 移除 Bot → VIP 订单回退到待处理
    await page.click('[data-testid="btn-remove-bot"]');

    const pendingCol = page.locator('[data-testid="column-pending"]');

    // 应有 2 个待处理订单（1 个普通 + 1 个回退的 VIP）
    await expect(pendingCol.locator('.order-card')).toHaveCount(2, { timeout: 5000 });

    // 关键验证：回退的 VIP 订单仍保持 VIP 图标（vip-glow 类）
    await expect(pendingCol.locator('.order-card.vip-glow')).toHaveCount(1, { timeout: 3000 });
  });

  test('无 Bot 时移除应返回错误', async ({ page }) => {
    const response = await page.request.delete('http://localhost:8080/api/v1/bots');
    expect(response.ok()).toBe(false);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('no bots');
  });

  test('连续快速添加 Bot 不产生重复', async ({ page }) => {
    // 快速连续点击 3 次
    await page.click('[data-testid="btn-add-bot"]');
    await page.click('[data-testid="btn-add-bot"]');
    await page.click('[data-testid="btn-add-bot"]');

    // 恰好 3 个（不重复）
    const botPanel = page.locator('[data-testid="bot-panel"]');
    await expect(botPanel.locator('.bot-item')).toHaveCount(3, { timeout: 5000 });
  });

  test('Bot 卡片显示创建时间', async ({ page }) => {
    await page.click('[data-testid="btn-add-bot"]');

    const botPanel = page.locator('[data-testid="bot-panel"]');
    await expect(botPanel.locator('.bot-item')).toHaveCount(1, { timeout: 5000 });

    // Bot 卡片文本包含 HH:MM:SS 格式的时间
    const botText = await botPanel.locator('.bot-item').textContent();
    const timeMatch = botText!.match(/\d{2}:\d{2}:\d{2}/);
    expect(timeMatch).not.toBeNull();
  });

  test('悬浮空闲 Bot 卡片弹出详细信息面板', async ({ page }) => {
    await page.click('[data-testid="btn-add-bot"]');

    const botPanel = page.locator('[data-testid="bot-panel"]');
    const botItem = botPanel.locator('.bot-item').first();
    await expect(botItem).toBeVisible({ timeout: 5000 });

    // 悬浮到 Bot 卡片
    await botItem.hover();

    // 验证 body 下出现 tooltip（Teleport 渲染到 body）
    const tooltip = page.locator('body > div[class*="shadow-xl"]').filter({ hasText: /#\d+/ }).last();
    await expect(tooltip).toBeVisible({ timeout: 3000 });

    const tooltipText = await tooltip.textContent();
    // tooltip 应包含 Bot 编号和时间
    expect(tooltipText).toMatch(/#\d+/);
    expect(tooltipText).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  test('悬浮工作中的 Bot 卡片弹出详细信息面板', async ({ page }) => {
    // 创建订单 + Bot，Bot 会立即接单进入工作状态
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-add-bot"]');

    const busyQueue = page.locator('[data-testid="bot-busy-queue"]');
    const botItem = busyQueue.locator('.bot-item').first();
    await expect(botItem).toBeVisible({ timeout: 5000 });

    // 悬浮到工作中的 Bot 卡片
    await botItem.hover();

    // 验证 body 下出现 tooltip
    const tooltip = page.locator('body > div[class*="shadow-xl"]').filter({ hasText: /#\d+/ }).last();
    await expect(tooltip).toBeVisible({ timeout: 3000 });

    const tooltipText = await tooltip.textContent();
    // tooltip 应包含 Bot 编号
    expect(tooltipText).toMatch(/#\d+/);
  });
});
