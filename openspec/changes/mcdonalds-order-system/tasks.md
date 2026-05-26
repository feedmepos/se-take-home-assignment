## 1. 后端 — 领域层 (Domain)

- [x] 1.1 定义领域类型：OrderType, OrderStatus, BotStatus
- [x] 1.2 实现 Order 聚合根：create, complete, returnToPending
- [x] 1.3 实现 Bot 实体：assignOrder, release, isIdle, isProcessing
- [x] 1.4 实现 DomainEvents：EventEmitter 封装
- [x] 1.5 实现 OrderProcessingEngine 核心领域服务：createOrder, addBot, removeBot, getOrders, getBots, addListener, tryProcessNext
- [x] 1.6 编写领域层单元测试（Vitest）：优先队列、Bot 调度、10 秒处理、销毁回退、IDLE 唤醒

## 2. 后端 — 应用层 (Application)

- [x] 2.1 实现 OrderService：封装 createOrder + getOrders 用例
- [x] 2.2 实现 BotService：封装 addBot + removeBot + getBots 用例
- [x] 2.3 编写应用层单元测试（Vitest）：mock OrderProcessingEngine，验证用例编排逻辑

## 3. 后端 — 基础设施层 (Infrastructure)

- [x] 3.1 初始化 Express + TypeScript 项目结构
- [x] 3.2 实现 REST 路由：POST /api/orders, GET /api/orders, POST /api/bots, DELETE /api/bots, GET /api/bots
- [x] 3.3 实现 WebSocketManager：/ws 端点，连接管理，order:completed 和 bot:status_changed 广播
- [x] 3.4 实现 server.ts 入口：Express + WS 启动，组装各层依赖
- [x] 3.5 编写基础设施层单元测试（Vitest）：mock 应用层服务，验证路由响应和 WS 事件广播

## 4. 前端 — 项目初始化

- [x] 4.1 初始化 Vite + React + TypeScript 项目
- [x] 4.2 配置 React Router：/orders 和 /bots 两个路由
- [x] 4.3 实现 NavBar 组件：Tab 切换（订单列表 | Bot 列表）

## 5. 前端 — 订单列表页

- [x] 5.1 实现 OrderControls 组件：New Normal Order / New VIP Order 按钮
- [x] 5.2 实现 OrderCard 组件：订单号、类型标签（VIP/Normal）、时间戳
- [x] 5.3 实现 PendingColumn 组件：PENDING 订单列表
- [x] 5.4 实现 CompleteColumn 组件：COMPLETE 订单列表
- [x] 5.5 实现 OrderListPage 页面：拼装双栏布局 + 控制按钮
- [x] 5.6 实现 api.ts 服务层：封装 fetch 调用 REST API

## 6. 前端 — Bot 列表页

- [x] 6.1 实现 BotControls 组件：+ Bot / - Bot 按钮
- [x] 6.2 实现 BotCard 组件：Bot 名称、状态标签（IDLE=绿色/PROCESSING=蓝色）、当前处理订单号
- [x] 6.3 实现 BotListPage 页面：拼装 Bot 列表 + 控制按钮

## 7. 前端 — WebSocket 集成

- [x] 7.1 实现 WebSocketClient 服务：singleton 连接管理、自动重连、事件分发（不依赖 React）
- [x] 7.2 实现 useWebSocket hook：仅封装订阅/注销，对接 React 生命周期
- [x] 7.3 在 OrderListPage 中监听 order:completed 事件：移动订单到 COMPLETE 列
- [x] 7.4 在 BotListPage 中监听 bot:status_changed 事件：更新 Bot 状态显示

## 8. 前端 — 组件单元测试

- [x] 8.1 配置 Vitest + React Testing Library 测试环境
- [x] 8.2 编写 api.ts 服务层单元测试：mock fetch 验证请求路径和参数
- [x] 8.3 编写 WebSocketClient 单元测试：连接建立、事件分发、断线重连
- [x] 8.4 编写 OrderCard 组件测试：渲染订单号、类型标签、时间戳
- [x] 8.5 编写 PendingColumn / CompleteColumn 组件测试：渲染订单列表、空状态
- [x] 8.6 编写 BotCard 组件测试：渲染 Bot 名称、IDLE/PROCESSING 状态标签、当前订单号
- [x] 8.7 编写 OrderControls 组件测试：按钮点击触发回调
- [x] 8.8 编写 BotControls 组件测试：+ Bot / - Bot 按钮点击触发回调
- [x] 8.9 编写 NavBar 组件测试：Tab 切换、当前路由高亮
- [x] 8.10 编写 useWebSocket hook 测试：订阅/注销生命周期

## 9. 前端 — e2e 测试

- [x] 9.1 配置 Playwright 测试环境
- [x] 9.2 编写 e2e：创建 Normal 订单 → 确认出现在 PENDING → 等 10 秒 → 确认进入 COMPLETE
- [x] 9.3 编写 e2e：创建 VIP 订单 → 确认排在 Normal 之前 → 确认优先处理
- [x] 9.4 编写 e2e：+ Bot → 确认创建 → 确认处理订单 → - Bot → 确认销毁 → 订单回退
- [x] 9.5 编写 e2e：页面路由切换正常工作
