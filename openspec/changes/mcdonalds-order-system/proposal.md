## Why

McDonald's 正在通过自动化烹饪机器人转型业务，需要一个订单控制系统来管理订单处理流程。该系统需支持 VIP 优先排队、机器人动态扩缩容，以及实时订单状态推送，以提升运营效率并降低人力成本。

## What Changes

- **新增** 前端 React + TypeScript SPA：双页面结构（订单列表页 / Bot 列表页），WebSocket 实时接收订单完成和机器人状态变更
- **新增** 后端 Node.js + TypeScript 服务：DDD 分层架构，Express REST API + WebSocket 推送，核心领域服务 OrderProcessingEngine
- **新增** 完整测试体系：Vitest 后端单元测试，Playwright 前端 e2e 测试

## Capabilities

### New Capabilities
- `order-priority-queue`: 订单优先队列 — Normal 订单 FIFO 入队，VIP 订单插入所有 Normal 订单之前但现有 VIP 订单之后，订单号唯一递增
- `bot-management`: 机器人管理 — 创建和销毁机器人（销毁最新的），每个机器人同时处理一个订单，处理时长 10 秒；新增立即处理，销毁时订单回到 PENDING 原位置
- `order-lifecycle`: 订单生命周期 — 新订单进入 PENDING 区域，机器人取单 10 秒后通过 WebSocket 推送完成事件进入 COMPLETE 区域，无订单时机器人 IDLE
- `realtime-push`: 实时推送 — WebSocket 推送 order:completed 和 bot:status_changed 事件，前端局部更新 UI

### Modified Capabilities
<!-- 无现有功能需要修改 -->

## Impact

- 新增 `backend/` 目录：DDD 分层 Node.js + TypeScript 应用（domain / application / infrastructure）
- 新增 `frontend/` 目录：Vite + React + TypeScript + React Router
- 新增 e2e 测试：Playwright
- 无外部数据库依赖（内存存储）
