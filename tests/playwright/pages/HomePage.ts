import { BasePage } from './BasePage';
import type { Page, Locator } from '@playwright/test';

export class HomePage extends BasePage {
  constructor(page: Page) { super(page); }

  // ─── 角色切换 ──────────────────────────────────────────────────────

  get customerBtn(): Locator { return this.byRole('button', { name: '顾客' }); }
  get managerBtn(): Locator { return this.byRole('button', { name: '经理' }); }

  async switchToCustomer() { await this.click(this.customerBtn); }
  async switchToManager() { await this.click(this.managerBtn); }

  // ─── 标题 ──────────────────────────────────────────────────────────

  get mainHeading(): Locator { return this.byRole('heading', { name: "McDonald's 订单追踪系统" }); }

  // ─── 创建订单 ──────────────────────────────────────────────────────

  get createOrderHeading(): Locator { return this.byRole('heading', { name: '创建订单' }); }
  get newNormalOrderBtn(): Locator { return this.byRole('button', { name: 'New Normal Order' }); }
  get newVipOrderBtn(): Locator { return this.byRole('button', { name: 'New VIP Order' }); }

  async createNormalOrder() { await this.click(this.newNormalOrderBtn); }
  async createVipOrder() { await this.click(this.newVipOrderBtn); }

  // ─── 机器人管理（仅经理）──────────────────────────────────────────

  get botManagerHeading(): Locator { return this.byRole('heading', { name: '机器人管理' }); }
  get addBotBtn(): Locator { return this.byRole('button', { name: '+ Bot' }); }
  get removeBotBtn(): Locator { return this.byRole('button', { name: '- Bot' }); }

  async addBot() { await this.click(this.addBotBtn); }
  async removeBot() { await this.click(this.removeBotBtn); }

  // ─── PENDING 区域 ──────────────────────────────────────────────────

  get pendingHeading(): Locator { return this.byRole('heading', { name: /PENDING/ }); }
  get noPendingOrders(): Locator { return this.byText('暂无待处理订单'); }

  // ─── COMPLETE 区域 ────────────────────────────────────────────────

  get completeHeading(): Locator { return this.byRole('heading', { name: /COMPLETE/ }); }
  get noCompletedOrders(): Locator { return this.byText('暂无已完成订单'); }

  // ─── 活动日志（仅经理）────────────────────────────────────────────

  get activityLogHeading(): Locator { return this.byRole('heading', { name: /活动日志/ }); }
  get noLogs(): Locator { return this.byText('暂无日志'); }

  // ─── 空状态 ───────────────────────────────────────────────────────

  get noBots(): Locator { return this.byText('暂无机器人'); }
}
