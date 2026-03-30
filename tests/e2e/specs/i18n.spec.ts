import { test, expect } from '@playwright/test';

test.describe('i18n 语言切换', () => {
  test('默认页面显示中文', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('locale'));
    await page.reload();

    // 验证标题
    await expect(page.locator('h1')).toContainText('订单管理系统');

    // 验证看板列标题
    await expect(page.locator('[data-testid="column-pending"] h2')).toContainText('待处理');
    await expect(page.locator('[data-testid="column-processing"] h2')).toContainText('处理中');
    await expect(page.locator('[data-testid="column-complete"] h2')).toContainText('已完成');
  });

  test('点击 EN 切换到英文', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('locale'));
    await page.reload();

    // 点击 EN 按钮
    await page.click('[data-testid="lang-en"]');

    // 验证标题切换为英文
    await expect(page.locator('h1')).toContainText('Order Manager');

    // 验证看板列标题切换
    await expect(page.locator('[data-testid="column-pending"] h2')).toContainText('Pending');
    await expect(page.locator('[data-testid="column-processing"] h2')).toContainText('Processing');
    await expect(page.locator('[data-testid="column-complete"] h2')).toContainText('Complete');
  });

  test('点击中切回中文', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('locale'));
    await page.reload();

    // 先切换到英文
    await page.click('[data-testid="lang-en"]');
    await expect(page.locator('h1')).toContainText('Order Manager');

    // 再切回中文
    await page.click('[data-testid="lang-zh"]');
    await expect(page.locator('h1')).toContainText('订单管理系统');

    // 验证看板列标题恢复中文
    await expect(page.locator('[data-testid="column-pending"] h2')).toContainText('待处理');
    await expect(page.locator('[data-testid="column-processing"] h2')).toContainText('处理中');
    await expect(page.locator('[data-testid="column-complete"] h2')).toContainText('已完成');
  });

  test('刷新页面后语言保留 localStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('locale'));
    await page.reload();

    // 先切换到英文
    await page.click('[data-testid="lang-en"]');
    await expect(page.locator('h1')).toContainText('Order Manager');

    // 验证 localStorage 已写入
    const locale = await page.evaluate(() => localStorage.getItem('locale'));
    expect(locale).toBe('en-US');

    // 刷新后仍为英文
    await page.reload();
    await expect(page.locator('h1')).toContainText('Order Manager');
    await expect(page.locator('[data-testid="column-pending"] h2')).toContainText('Pending');
  });

  test('语言按钮高亮状态正确', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('locale'));
    await page.reload();

    // 默认中文按钮高亮
    const zhBtn = page.locator('[data-testid="lang-zh"]');
    const enBtn = page.locator('[data-testid="lang-en"]');
    await expect(zhBtn).toHaveClass(/font-bold/);

    // 切换到英文后英文按钮高亮
    await enBtn.click();
    await expect(enBtn).toHaveClass(/font-bold/);
  });

  test('EN 按钮显示文字正确', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('locale'));
    await page.reload();

    // 验证按钮文字
    await expect(page.locator('[data-testid="lang-zh"]')).toContainText('中');
    await expect(page.locator('[data-testid="lang-en"]')).toContainText('EN');
  });
});
