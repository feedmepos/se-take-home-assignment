import { test, expect } from '@playwright/test';

test.describe('订单完整流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="action-bar"]')).toBeVisible({ timeout: 10000 });
    // 重置系统状态，确保测试隔离
    await page.evaluate(() => fetch('/api/v1/reset', { method: 'DELETE' }).then(() => new Promise(r => setTimeout(r, 300))));
    await expect(page.locator('.order-card')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('.bot-item')).toHaveCount(0, { timeout: 3000 });
  });

  test('创建普通订单 → 添加 Bot → 处理完成', async ({ page }) => {
    // 创建普通订单
    await page.click('[data-testid="btn-new-normal"]');

    // 验证待处理列恰好 1 张卡片（不重复）
    const pendingCol = page.locator('[data-testid="column-pending"]');
    await expect(pendingCol.locator('.order-card')).toHaveCount(1, { timeout: 3000 });

    // 添加 Bot
    await page.click('[data-testid="btn-add-bot"]');

    // 验证订单移到处理中列（恰好 1 张，不重复）
    const processingCol = page.locator('[data-testid="column-processing"]');
    await expect(processingCol.locator('.order-card')).toHaveCount(1, { timeout: 3000 });

    // 等待处理完成（10 秒处理时间）
    const completeCol = page.locator('[data-testid="column-complete"]');
    await expect(completeCol.locator('.order-card')).toHaveCount(1, { timeout: 15_000 });

    // 全过程中不应出现重复卡片
    const allCards = page.locator('.order-card');
    await expect(allCards).toHaveCount(1, { timeout: 3000 });
  });

  test('创建多个订单不产生重复图标', async ({ page }) => {
    // 连续创建 3 个普通订单
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-new-normal"]');

    // 避免重复：恰好 3 张卡片
    const pendingCol = page.locator('[data-testid="column-pending"]');
    await expect(pendingCol.locator('.order-card')).toHaveCount(3, { timeout: 5000 });
  });

  test('订单卡片时间显示为 HH:MM:SS 格式而非 Invalid Date', async ({ page }) => {
    await page.click('[data-testid="btn-new-normal"]');

    const pendingCol = page.locator('[data-testid="column-pending"]');
    await expect(pendingCol.locator('.order-card')).toHaveCount(1, { timeout: 3000 });

    // 获取卡片全部文本，确认不包含 Invalid Date
    const allText = await pendingCol.locator('.order-card').textContent();
    expect(allText).not.toContain('Invalid Date');
    expect(allText).not.toContain('NaN');
    expect(allText).not.toContain('null');
    expect(allText).not.toContain('undefined');

    // 时间应为 HH:MM:SS 格式
    const timeMatch = allText!.match(/\d{2}:\d{2}:\d{2}/);
    expect(timeMatch).not.toBeNull();
  });

  test('处理中订单卡片显示 Bot 编号、处理开始时间和进度条', async ({ page }) => {
    // 创建订单 + Bot
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-add-bot"]');

    const processingCol = page.locator('[data-testid="column-processing"]');
    await expect(processingCol.locator('.order-card')).toHaveCount(1, { timeout: 5000 });

    const cardText = await processingCol.locator('.order-card').textContent();

    // 验证显示 Bot 编号（卡片显示 B#N 格式）
    expect(cardText).toContain('B#');

    // 验证显示处理开始时间（HH:MM:SS 格式）
    const timeMatches = cardText!.match(/\d{2}:\d{2}:\d{2}/g);
    expect(timeMatches).not.toBeNull();
    expect(timeMatches!.length).toBeGreaterThanOrEqual(1);

    // 验证进度条存在
    await expect(processingCol.locator('[data-testid="progress-bar"]')).toHaveCount(1);
  });

  test('已完成订单卡片显示 Bot 编号和完成时间', async ({ page }) => {
    // 创建订单 + Bot
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-add-bot"]');

    // 等待处理完成
    const completeCol = page.locator('[data-testid="column-complete"]');
    await expect(completeCol.locator('.order-card')).toHaveCount(1, { timeout: 15_000 });

    const cardText = await completeCol.locator('.order-card').textContent();

    // 验证显示 Bot 编号（卡片显示 B#N 格式）
    expect(cardText).toContain('B#');

    // 验证显示完成时间（HH:MM:SS 格式）
    const timeMatches = cardText!.match(/\d{2}:\d{2}:\d{2}/g);
    expect(timeMatches).not.toBeNull();
    expect(timeMatches!.length).toBeGreaterThanOrEqual(1);
  });

  test('重置系统后清空所有订单和 Bot', async ({ page }) => {
    // 创建订单和 Bot
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-new-vip"]');
    await page.click('[data-testid="btn-add-bot"]');

    // 确认有待处理和处理中的数据
    const pendingCol = page.locator('[data-testid="column-pending"]');
    await expect(pendingCol.locator('.order-card')).toHaveCount(1, { timeout: 3000 });

    // 点击重置按钮（确认对话框点确定）
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('[data-testid="btn-reset"]');

    // 验证所有列和 Bot 面板为空
    await expect(page.locator('.order-card')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('.bot-item')).toHaveCount(0, { timeout: 3000 });
  });

  test('悬浮待处理订单卡片弹出详细信息面板', async ({ page }) => {
    await page.click('[data-testid="btn-new-normal"]');

    const pendingCol = page.locator('[data-testid="column-pending"]');
    const card = pendingCol.locator('.order-card').first();
    await expect(card).toBeVisible({ timeout: 3000 });

    // 悬浮到订单卡片
    await card.hover();

    // 验证 body 下出现 tooltip（Teleport 渲染到 body）
    // tooltip 包含订单编号（#开头）和时间信息
    const tooltip = page.locator('body > div[class*="shadow-xl"]').filter({ hasText: /#\d+/ }).last();
    await expect(tooltip).toBeVisible({ timeout: 3000 });

    // tooltip 应包含时间信息
    const tooltipText = await tooltip.textContent();
    expect(tooltipText).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  test('悬浮已完成订单卡片弹出详细信息面板', async ({ page }) => {
    await page.click('[data-testid="btn-new-normal"]');
    await page.click('[data-testid="btn-add-bot"]');

    // 等待处理完成
    const completeCol = page.locator('[data-testid="column-complete"]');
    await expect(completeCol.locator('.order-card')).toHaveCount(1, { timeout: 15_000 });

    // 悬浮到已完成订单卡片
    const card = completeCol.locator('.order-card').first();
    await card.hover();

    // 验证 body 下出现 tooltip
    const tooltip = page.locator('body > div[class*="shadow-xl"]').filter({ hasText: /#\d+/ }).last();
    await expect(tooltip).toBeVisible({ timeout: 3000 });

    const tooltipText = await tooltip.textContent();
    // 已完成 tooltip 应包含 Bot 编号和时间
    expect(tooltipText).toMatch(/#\d+/);
    expect(tooltipText).toMatch(/\d{2}:\d{2}:\d{2}/);
  });
});
