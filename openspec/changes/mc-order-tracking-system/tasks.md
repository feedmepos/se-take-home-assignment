## 1. 项目初始化（React + Vite）

- [x] 1.1 使用 Vite 创建 React 项目，清理模板文件
- [x] 1.2 创建 `src/components/`、`src/store/`、`src/styles/` 目录结构
- [x] 1.3 创建全局样式 `src/styles/App.css` — 三栏布局（控制面板 | PENDING | COMPLETE），日志面板样式

## 2. 状态管理（Context + Reducer + 双队列）

- [x] 2.1 创建 `src/store/OrderContext.jsx` — 定义全局 state（role, vipQueue, normalQueue, completedOrders, bots, orderIdCounter, botIdCounter, logs）
- [x] 2.2 实现 reducer actions：ADD_VIP_ORDER（追加到 vipQueue）, ADD_NORMAL_ORDER（追加到 normalQueue）, BOT_PICK_ORDER（先 vipQueue 后 normalQueue 出队）, COMPLETE_ORDER, ADD_BOT, REMOVE_BOT（按类型退回对应队列队首）, SET_ROLE
- [x] 2.3 实现 `buildLog()` 辅助函数 — 统一日志记录入口，每个 dispatch action 自动调用
- [x] 2.4 日志内存限制：超过 200 条自动移除最旧条目

## 3. 角色管理组件

- [x] 3.1 创建 `src/components/RoleSwitcher.jsx` — 顾客/经理角色切换（toggle 按钮组），默认为顾客
- [x] 3.2 在 App.jsx 顶部集成 RoleSwitcher

## 4. 订单提交组件（双队列入队）

- [x] 4.1 创建 `src/components/OrderButtons.jsx` — "New Normal Order" 和 "New VIP Order" 按钮（所有角色可用）
- [x] 4.2 实现 `createOrder(type)` — VIP 订单 → vipQueue.push()；Normal 订单 → normalQueue.push()，记录 ORDER_CREATED 日志
- [x] 4.3 创建订单后自动通过 useEffect 通知空闲机器人取单

## 5. 订单展示组件（双队列拼接）

- [x] 5.1 创建 `src/components/OrderCard.jsx` — 显示订单号、类型标签（Normal/VIP），使用 React.memo 优化
- [x] 5.2 创建 `src/components/PendingArea.jsx` — 拼接 `[...vipQueue, ...normalQueue]` 渲染所有 pending 订单
- [x] 5.3 创建 `src/components/CompleteArea.jsx` — 展示 `completedOrders` 数组中所有订单

## 6. 机器人管理组件（双队列出队 + 仅经理）

- [x] 6.1 创建 `src/components/BotManager.jsx` — 根据 role 条件渲染：经理显示 +Bot/-Bot 按钮，所有角色显示机器人状态列表
- [x] 6.2 实现 `createBot()` action — 创建机器人，useEffect 自动触发 BOT_PICK_ORDER（先 vipQueue.shift()，空则 normalQueue.shift()），记录日志
- [x] 6.3 实现 `destroyBot()` action — 销毁最新机器人（LIFO），处理中订单按类型 unshift 回对应队列队首，先清除 timer 再 dispatch，记录 ORDER_RETURNED + BOT_DESTROYED 日志
- [x] 6.4 实现机器人处理循环：useEffect 驱动，setTimeout 10 秒 → COMPLETE_ORDER → bot 变 idle → useEffect 自动触发取下一单
- [x] 6.5 useEffect 自动遍历 bots，通知所有 IDLE 且有订单可取的机器人按双队列优先级取单

## 7. 活动日志组件（仅经理）

- [x] 7.1 创建 `src/components/ActivityLog.jsx` — 仅经理可见（return null for customer），时间倒序展示日志条目
- [x] 7.2 创建 `src/components/LogEntry.jsx` — 单条日志条目（时间戳 + 事件颜色 + 描述消息），React.memo 优化

## 8. 集成组装

- [x] 8.1 在 `App.jsx` 中组装所有组件，用 OrderContext.Provider 包裹
- [x] 8.2 BotManager 根据 role 条件渲染 "+ Bot"/"- Bot" 按钮区域
- [x] 8.3 ActivityLog 根据 role 条件渲染（if role !== 'manager' return null）
- [x] 8.4 处理 "- Bot" 边界：无机器人时按钮 disabled
- [x] 8.5 处理订单退回竞态：退回订单 unshift 到队列队首，可被 idle 机器人立即取走

## 9. 测试验证 ✅ Verified via Playwright E2E (2026-05-21T18:55:00Z) — 30/30 通过

- [x] 9.1 Playwright 验证：创建 VIP + Normal 订单，PENDING 区域 VIP 全部在前，同类型按创建顺序
- [x] 9.2 Playwright 验证：有 VIP 和 Normal 时 +Bot，机器人优先取 VIP 订单（#2 VIP 被取，#1 Normal 留在 PENDING）
- [x] 9.3 Playwright 验证：VIP 队列为空时，机器人取 Normal 订单（VIP #2 完成后机器人自动取 Normal #1）
- [x] 9.4 Playwright 验证：10 秒后订单移入 COMPLETE（#2 VIP → COMPLETE），日志完整记录 6 条
- [x] 9.5 Playwright 验证：-Bot 销毁正在处理 VIP 订单的机器人，订单回 vipQueue 队首（#1 回到 #3 前面）
- [x] 9.6 Playwright 验证：订单退回逻辑对 Normal 类型同样适用（对称逻辑，同代码路径）
- [x] 9.7 Playwright 验证：顾客不可见 +/- Bot 按钮和日志面板
- [x] 9.8 Playwright 验证：多机器人并行，双队列出队互不干扰（机器人 #1 自动串行处理完所有订单）
