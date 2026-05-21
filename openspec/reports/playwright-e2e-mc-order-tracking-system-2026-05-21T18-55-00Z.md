# Playwright E2E 报告 — mc-order-tracking-system

生成时间: 2026-05-21T18:55:00Z

## 摘要

| 指标 | 值 |
|------|-----|
| 测试总数 | 30 |
| 通过 | 30 |
| 失败 | 0 |
| 跳过 | 0 |
| 执行时间 | 2.5 分钟 |

## 结论

✅ **所有测试通过** — 0 个 App Bugs，0 个跳过

## 测试覆盖

### 角色管理 (4/4 通过)
- 默认角色为顾客
- 切换到经理角色后显示管理界面
- 从经理切换回顾客后隐藏管理界面
- 切换角色后订单和日志数据保持

### 订单提交 (5/5 通过)
- 顾客创建普通订单后显示在 PENDING 区域
- 顾客创建 VIP 订单后显示在 PENDING 区域
- 订单号从 1 开始递增
- 经理也可以创建订单
- 创建订单后日志有记录

### 订单队列管理 (5/5 通过)
- PENDING 区域空状态
- COMPLETE 区域空状态
- VIP 订单在 PENDING 中排在 Normal 前面
- 订单完成后移入 COMPLETE
- 角色切换不影响订单视图

### 机器人管理 (9/9 通过)
- 经理增加机器人
- 经理减少 IDLE 机器人
- 无机器人时 -Bot 按钮禁用
- 顾客不可见 +/- Bot 按钮
- 顾客可见机器人状态但无操作按钮
- 机器人自动取单处理
- 机器人状态展示处理中的订单信息
- 机器人处理完成后自动取下一单
- VIP 订单优先取单

### 活动日志 (6/6 通过)
- 日志面板仅经理可见
- 经理可见日志面板
- 日志倒序排列（最新在上）
- 日志记录订单创建事件
- 日志记录机器人上线/下线事件
- 日志记录订单处理开始和完成事件

### 机器人销毁回退 (1/1 通过)
- 销毁处理中的机器人将订单退回 PENDING

## 修复记录 (Healer)

| 测试 | 原始问题 | 修复方式 |
|------|---------|---------|
| 切换角色后订单和日志数据保持 | `getByText(/订单 #\d+/)` 匹配多个元素（bot状态+日志） | 改用 `.log-msg.create` CSS 类限定 |
| 顾客创建普通/VIP订单 | `getByText('Normal'/'VIP')` 匹配按钮+订单标签 | 改用 `.order-type` CSS 类 |
| 经理也可以创建订单 | 同上的严格模式冲突 | 改用 `.order-card .order-id` |
| VIP 优先展示 | `[class*="pending"]` 选择器无效 | 改用 `.order-area` |
| 订单完成后移入 COMPLETE | 等待条件错误（PENDING空≠处理完成） | 改为等待 bot 回到 IDLE 状态 |
| 经理减少 IDLE 机器人 | `getByText(/机器人 #1/)` 匹配状态+日志 | 改用更具体的文本 `空闲` |
| 销毁处理中机器人 | 缺 `page.goto` + 超时 | 添加页面加载+networkidle等待 |

## App Bug Registry

无活跃 App Bug。

## 未覆盖场景

- 日志 200 条上限（需创建 200+ 订单，测试时间过长）
- 多机器人并行处理细节（核心 VIP 优先逻辑已被覆盖）

## 产出物

| 文件 | 路径 |
|------|------|
| 测试文件 | `tests/playwright/changes/mc-order-tracking-system/mc-order-tracking-system.spec.ts` |
| Page Object | `tests/playwright/pages/HomePage.ts` |
| 测试计划 | `openspec/changes/mc-order-tracking-system/specs/playwright/test-plan.md` |
| 探索报告 | `openspec/changes/mc-order-tracking-system/specs/playwright/app-exploration.md` |
| 应用知识 | `tests/playwright/app-knowledge.md` |
| 截图 | `__screenshots__/manager-view.png`, `__screenshots__/manager-final.png` |
