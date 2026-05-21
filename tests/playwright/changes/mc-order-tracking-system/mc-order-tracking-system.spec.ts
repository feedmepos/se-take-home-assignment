import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/HomePage';

test.describe('角色管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('默认角色为顾客', async ({ page }) => {
    const home = new HomePage(page);
    await expect(home.customerBtn).toHaveAttribute('class', /active/i);
    await expect(home.addBotBtn).not.toBeAttached();
    await expect(home.removeBotBtn).not.toBeAttached();
    await expect(home.activityLogHeading).not.toBeAttached();
  });

  test('切换到经理角色后显示管理界面', async ({ page }) => {
    const home = new HomePage(page);
    await home.switchToManager();
    await expect(home.addBotBtn).toBeVisible();
    await expect(home.removeBotBtn).toBeVisible();
    await expect(home.activityLogHeading).toBeVisible();
    await expect(home.newNormalOrderBtn).not.toBeAttached();
    await expect(home.newVipOrderBtn).not.toBeAttached();
  });

  test('从经理切换回顾客后隐藏管理界面', async ({ page }) => {
    const home = new HomePage(page);
    await home.switchToManager();
    await home.switchToCustomer();
    await expect(home.addBotBtn).not.toBeAttached();
    await expect(home.removeBotBtn).not.toBeAttached();
    await expect(home.activityLogHeading).not.toBeAttached();
  });

  test('从经理切回顾客后订单创建面板恢复', async ({ page }) => {
    const home = new HomePage(page);
    await home.switchToManager();
    await expect(home.newNormalOrderBtn).not.toBeAttached();
    await home.switchToCustomer();
    await expect(home.newNormalOrderBtn).toBeVisible();
    await expect(home.newVipOrderBtn).toBeVisible();
    await expect(home.createOrderHeading).toBeVisible();
  });

  test('切换角色后订单和日志数据保持', async ({ page }) => {
    const home = new HomePage(page);
    // 顾客创建订单
    await home.createNormalOrder();
    // 切到经理加机器人
    await home.switchToManager();
    await home.addBot();
    // 切回顾客验证订单存在
    await home.switchToCustomer();
    await expect(home.pendingHeading).toBeVisible();
    // 切回经理验证日志完整
    await home.switchToManager();
    await expect(home.activityLogHeading).toBeVisible();
    await expect(page.getByText(/机器人 #\d+ 已上线/)).toBeVisible();
    await expect(page.locator('.log-msg.create').first()).toBeVisible();
  });
});

test.describe('订单提交', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('顾客创建普通订单后显示在 PENDING 区域', async ({ page }) => {
    const home = new HomePage(page);
    await home.createNormalOrder();
    await expect(home.pendingHeading).toBeVisible();
    await expect(page.locator('.order-id').first()).toBeVisible();
    await expect(page.locator('.order-type').first()).toContainText('Normal');
  });

  test('顾客创建 VIP 订单后显示在 PENDING 区域', async ({ page }) => {
    const home = new HomePage(page);
    await home.createVipOrder();
    await expect(page.locator('.order-id').first()).toBeVisible();
    await expect(page.locator('.order-type').first()).toContainText('VIP');
  });

  test('订单号从 1 开始递增', async ({ page }) => {
    const home = new HomePage(page);
    await home.createNormalOrder();
    await home.createVipOrder();
    await home.createNormalOrder();
    // 切换到经理看日志验证订单号
    await home.switchToManager();
    await expect(page.getByText('订单 #1 (Normal) 已创建')).toBeVisible();
    await expect(page.getByText('订单 #2 (VIP) 已创建')).toBeVisible();
    await expect(page.getByText('订单 #3 (Normal) 已创建')).toBeVisible();
  });

  test('经理不可见创建订单按钮', async ({ page }) => {
    const home = new HomePage(page);
    await home.switchToManager();
    await expect(home.newNormalOrderBtn).not.toBeAttached();
    await expect(home.newVipOrderBtn).not.toBeAttached();
  });

  test('经理角色不可见创建订单面板', async ({ page }) => {
    const home = new HomePage(page);
    await home.switchToManager();
    await expect(home.createOrderHeading).not.toBeAttached();
  });

  test('创建订单后日志有记录', async ({ page }) => {
    const home = new HomePage(page);
    await home.createNormalOrder();
    await home.switchToManager();
    await expect(page.getByText(/订单 #\d+ \(Normal\) 已创建/)).toBeVisible();
  });
});

test.describe('订单队列管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('PENDING 区域空状态', async ({ page }) => {
    const home = new HomePage(page);
    await expect(home.noPendingOrders).toBeVisible();
  });

  test('COMPLETE 区域空状态', async ({ page }) => {
    const home = new HomePage(page);
    await expect(home.noCompletedOrders).toBeVisible();
  });

  test('VIP 订单在 PENDING 中排在 Normal 前面', async ({ page }) => {
    const home = new HomePage(page);
    // 先创建 Normal 订单 #1, 再创建 VIP 订单 #2
    await home.createNormalOrder();
    await home.createVipOrder();
    // PENDING 区域是第一个 .order-area
    const pendingArea = page.locator('.order-area').first();
    const pendingText = await pendingArea.textContent();
    // VIP 应排在 Normal 前面
    const vipIndex = pendingText?.indexOf('VIP') ?? -1;
    const normalIndex = pendingText?.indexOf('Normal') ?? -1;
    expect(vipIndex).toBeGreaterThan(-1);
    expect(normalIndex).toBeGreaterThan(-1);
    expect(vipIndex).toBeLessThan(normalIndex);
  });

  test('订单完成后移入 COMPLETE', async ({ page }) => {
    const home = new HomePage(page);
    await home.createNormalOrder();
    await home.switchToManager();
    await home.addBot();
    // 等待处理完成 — bot 回到 IDLE 状态
    await expect(page.getByText(/机器人 #1 — 空闲/)).toBeVisible({ timeout: 15000 });
    // COMPLETE 区域计数应变为 1
    await expect(page.getByRole('heading', { name: 'COMPLETE 1' })).toBeVisible();
  });

  test('角色切换不影响订单视图', async ({ page }) => {
    const home = new HomePage(page);
    await home.createNormalOrder();
    await home.createVipOrder();
    const pendingTextBefore = await page.textContent('[class*="pending"]');
    await home.switchToManager();
    const pendingTextAfter = await page.textContent('[class*="pending"]');
    expect(pendingTextAfter).toBe(pendingTextBefore);
  });
});

test.describe('机器人管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('经理增加机器人', async ({ page }) => {
    const home = new HomePage(page);
    await home.switchToManager();
    await home.addBot();
    await expect(page.getByText(/机器人 #1 — 空闲/)).toBeVisible();
    await expect(page.getByText('机器人 #1 已上线')).toBeVisible();
  });

  test('经理减少 IDLE 机器人', async ({ page }) => {
    const home = new HomePage(page);
    await home.switchToManager();
    await home.addBot();
    await home.addBot();
    await home.removeBot();
    // 机器人 #2 被销毁（最新创建的）
    await expect(page.getByText('机器人 #2 已下线')).toBeVisible();
    // 机器人 #1 仍在（检查空闲状态文本）
    await expect(page.getByText(/机器人 #1 — 空闲/)).toBeVisible();
  });

  test('无机器人时 -Bot 按钮禁用', async ({ page }) => {
    const home = new HomePage(page);
    await home.switchToManager();
    await expect(home.removeBotBtn).toBeDisabled();
    await home.addBot();
    await expect(home.removeBotBtn).toBeEnabled();
  });

  test('顾客不可见 +/- Bot 按钮', async ({ page }) => {
    const home = new HomePage(page);
    await expect(home.addBotBtn).not.toBeAttached();
    await expect(home.removeBotBtn).not.toBeAttached();
  });

  test('顾客可见机器人状态但无操作按钮', async ({ page }) => {
    const home = new HomePage(page);
    await home.switchToManager();
    await home.addBot();
    await home.switchToCustomer();
    await expect(page.getByText(/机器人 #1 — 空闲/)).toBeVisible();
    await expect(home.addBotBtn).not.toBeAttached();
    await expect(home.removeBotBtn).not.toBeAttached();
  });

  test('机器人自动取单处理', async ({ page }) => {
    const home = new HomePage(page);
    await home.createNormalOrder();
    await home.switchToManager();
    await home.addBot();
    // 机器人应立即取单，显示"处理中"
    await expect(page.getByText(/机器人 #1 — 处理中/)).toBeVisible({ timeout: 5000 });
  });

  test('机器人状态展示处理中的订单信息', async ({ page }) => {
    const home = new HomePage(page);
    await home.createVipOrder();
    await home.switchToManager();
    await home.addBot();
    await expect(page.getByText(/机器人 #1 — 处理中: 订单 #\d+ \(VIP\)/)).toBeVisible({ timeout: 5000 });
  });

  test('机器人处理完成后自动取下一单', async ({ page }) => {
    const home = new HomePage(page);
    await home.createNormalOrder();
    await home.switchToManager();
    await home.addBot();
    // 等第一个订单开始处理
    await expect(page.getByText(/机器人 #1 — 处理中/)).toBeVisible({ timeout: 5000 });
    // 等处理完成并取下一个订单
    await expect(page.getByText(/机器人 #1 — 空闲/)).toBeVisible({ timeout: 15000 });
    // 订单应该已完成
    await expect(page.getByText(/COMPLETE 1/)).toBeVisible();
  });

  test('VIP 订单优先取单', async ({ page }) => {
    const home = new HomePage(page);
    // 先创建 Normal
    await home.createNormalOrder();
    // 再创建 VIP（此时无机器人，两个都在 PENDING）
    await home.createVipOrder();
    // 现在加入机器人，应优先取 VIP
    await home.switchToManager();
    await home.addBot();
    await expect(page.getByText(/机器人 #1 — 处理中: 订单 #2 \(VIP\)/)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('活动日志', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('日志面板仅经理可见', async ({ page }) => {
    const home = new HomePage(page);
    await expect(home.activityLogHeading).not.toBeAttached();
  });

  test('经理可见日志面板', async ({ page }) => {
    const home = new HomePage(page);
    await home.switchToManager();
    await expect(home.activityLogHeading).toBeVisible();
  });

  test('日志倒序排列（最新在上）', async ({ page }) => {
    const home = new HomePage(page);
    await home.switchToManager();
    await home.addBot();
    await home.switchToCustomer();
    await home.createNormalOrder();
    // 获取日志区域文本
    await home.switchToManager();
    const logText = await page.textContent('[class*="log"]');
    // 最新的事件应在最前面
    const createIndex = logText?.indexOf('已创建') ?? -1;
    const onlineIndex = logText?.indexOf('已上线') ?? -1;
    // 创建事件（新）应该在上线事件（旧）之前
    expect(createIndex).toBeLessThan(onlineIndex);
  });

  test('日志记录订单创建事件', async ({ page }) => {
    const home = new HomePage(page);
    await home.createNormalOrder();
    await home.switchToManager();
    await expect(page.getByText(/订单 #\d+ \(Normal\) 已创建/)).toBeVisible();
  });

  test('日志记录机器人上线/下线事件', async ({ page }) => {
    const home = new HomePage(page);
    await home.switchToManager();
    await home.addBot();
    await expect(page.getByText(/机器人 #\d+ 已上线/)).toBeVisible();
    await home.removeBot();
    await expect(page.getByText(/机器人 #\d+ 已下线/)).toBeVisible();
  });

  test('日志记录订单处理开始和完成事件', async ({ page }) => {
    const home = new HomePage(page);
    await home.createNormalOrder();
    await home.switchToManager();
    await home.addBot();
    await expect(page.getByText(/机器人 #\d+ 开始处理订单 #\d+/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/订单 #\d+ 已完成，由机器人 #\d+ 处理/)).toBeVisible({ timeout: 15000 });
  });
});

test.describe('机器人销毁回退', () => {
  test('销毁处理中的机器人将订单退回 PENDING', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const home = new HomePage(page);
    await home.createNormalOrder();
    await home.switchToManager();
    await home.addBot();
    // 确认机器人正在处理
    await expect(page.getByText(/机器人 #1 — 处理中/)).toBeVisible({ timeout: 5000 });
    // 立即销毁机器人
    await home.removeBot();
    // 订单应退回 PENDING
    await expect(page.getByText(/PENDING 1/)).toBeVisible({ timeout: 5000 });
    // 日志应有退回记录
    await expect(page.getByText(/订单 #\d+ 退回 PENDING/)).toBeVisible({ timeout: 5000 });
    // 机器人下线
    await expect(page.getByText(/机器人 #\d+ 已下线/)).toBeVisible();
  });
});
