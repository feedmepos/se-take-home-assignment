## Context

实现麦当劳订单控制系统，支持 VIP 优先队列、机器人动态扩缩容、订单 10 秒处理周期。前端 React + TypeScript 双页面结构，后端 Node.js + TypeScript DDD 分层架构，WebSocket 实时推送订单完成与机器人状态变更。内存存储，无需持久化。

## Goals / Non-Goals

**Goals:**
- 前端双页面：订单列表页（PENDING + COMPLETE 双栏）+ Bot 列表页（含增删控制），React Router 路由切换
- 后端 DDD 分层：domain（纯逻辑）→ application（用例编排）→ infrastructure（Express + WS）
- WebSocket 推送 `order:completed` 和 `bot:status_changed` 事件，其余状态通过 REST API 获取
- VIP 优先排队、机器人增减、10 秒处理周期全部在领域层实现
- 完整测试：Vitest 后端单元测试 + Playwright 前端 e2e

**Non-Goals:**
- 数据持久化
- CLI 模式（纯后端项目选项，不适用）
- 用户认证
- 多实例/分布式部署

## Decisions

### 架构：DDD 分层

```
backend/src/
├── domain/                    # 领域层 — 纯逻辑，零框架依赖
│   ├── model/
│   │   ├── Order.ts           # 聚合根
│   │   ├── Bot.ts             # 实体
│   │   └── types.ts           # OrderType, OrderStatus, BotStatus
│   ├── service/
│   │   └── OrderProcessingEngine.ts  # 核心领域服务
│   └── event/
│       └── DomainEvents.ts    # EventEmitter 封装
│
├── application/               # 应用层 — 用例编排
│   └── service/
│       ├── OrderService.ts    # 订单用例
│       └── BotService.ts      # Bot 用例
│
├── infrastructure/            # 基础设施层
│   ├── http/
│   │   └── routes.ts          # Express REST 路由
│   └── ws/
│       └── WebSocketManager.ts # WS 连接管理 + 事件广播
│
└── server.ts                  # 入口：Express + WS 启动
```

**依赖方向：** `server → infrastructure → application → domain`。Domain 层不 import 任何框架代码。

### 领域模型

```
Order {
  id: number           // 全局递增
  type: OrderType      // 'VIP' | 'NORMAL'
  status: OrderStatus  // 'PENDING' | 'PROCESSING' | 'COMPLETE'
  createdAt: number
  completedAt?: number // HH:MM:SS 格式展示用
}

Bot {
  id: number           // 全局递增
  name: string         // "Bot-{n}"
  status: BotStatus    // 'IDLE' | 'PROCESSING'
  currentOrderId?: number
  timerId?: NodeJS.Timeout
}
```

### OrderProcessingEngine 接口

```typescript
interface OrderProcessingEngine {
  createOrder(type: OrderType): Order
  getOrders(): Order[]
  addBot(): Bot
  removeBot(): void
  getBots(): Bot[]
  addListener(event: string, fn: Function): void
}
```

引擎内部维护：
- `orders: Order[]` — 按优先级排列，VIP 在前 Normal 在后，同类型按创建时间
- `bots: Bot[]` — 按创建顺序排列，removeBot 移除最后一个
- `nextOrderId` / `nextBotId` — 自增计数器
- `eventEmitter` — 事件总线

### API 设计

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/orders | 创建订单 `{ type: 'VIP' \| 'NORMAL' }` → 返回 Order，前端再调 GET 刷新 |
| GET | /api/orders | 获取所有订单 |
| POST | /api/bots | 增加一个 Bot → 返回 Bot，前端再调 GET 刷新 |
| DELETE | /api/bots | 移除最新 Bot → 前端再调 GET 刷新 |
| GET | /api/bots | 获取所有 Bot |

### WebSocket 事件

```
WS Endpoint: /ws

仅推送两种事件：

1. order:completed
   → payload: Order (含 completedAt 时间戳)
   → 前端将订单从 PENDING 列移到 COMPLETE 列

2. bot:status_changed
   → payload: { bot: Bot, newStatus: 'IDLE' | 'PROCESSING' }
   → 前端更新 Bot 卡片状态显示
   → Bot IDLE 且 PENDING 有订单时，触发下一个处理周期
```

**不推送的事件（前端通过 REST 刷新获取）：**
- 订单创建 → POST 返回后 GET /api/orders
- 订单被取走 → bot:status_changed 已包含 currentOrderId
- Bot 增删 → POST/DELETE 返回后 GET /api/bots

### 调度流程

```
createOrder(type)
  → 插入 orders[] (VIP 在 Normal 之前)
  → 遍历 bots[]，若有 IDLE bot 则 tryProcessNext(bot)

addBot()
  → 创建新 Bot，追加到 bots[]
  → tryProcessNext(newBot)

removeBot()
  → 取 bots[] 最后一个（最新的）
  → 若 PROCESSING: clearTimeout，订单 returnToPending()（插回原位置）
  → 从 bots[] 移除

tryProcessNext(bot)
  → 找 orders[] 中第一个 status === PENDING 的订单
  → 若有: bot.status = PROCESSING, order.startProcessing()
         setTimeout 10s → order.complete(), emit order:completed
         emit bot:status_changed (PROCESSING → IDLE)
         tryProcessNext(bot) // 继续处理下一个
  → 若无: bot.status = IDLE, emit bot:status_changed(IDLE)
```

### 前端结构

```
frontend/src/
├── pages/
│   ├── OrderListPage.tsx     # /orders
│   └── BotListPage.tsx       # /bots
├── components/
│   ├── NavBar.tsx            # 页面切换 Tab
│   ├── OrderCard.tsx         # 单张订单卡片
│   ├── PendingColumn.tsx     # PENDING 列
│   ├── CompleteColumn.tsx    # COMPLETE 列
│   ├── OrderControls.tsx     # 创建订单按钮
│   └── BotCard.tsx           # 单张 Bot 卡片
├── services/
│   ├── api.ts                # REST API 封装 (fetch)
│   └── WebSocketClient.ts    # WS 连接管理、自动重连、事件分发（基础设施层）
├── hooks/
│   └── useWebSocket.ts       # 仅负责订阅/注销，对接 React 生命周期
├── App.tsx                   # React Router 路由
└── main.tsx
```

### 前端数据流

```
创建订单:
  POST /api/orders → GET /api/orders → 更新订单列表

创建 Bot:
  POST /api/bots → GET /api/bots → 更新 Bot 列表

移除 Bot:
  DELETE /api/bots → GET /api/bots → 更新 Bot 列表

实时事件:
  WS order:completed → PENDING/PROCESSING 订单进入 COMPLETE
  WS bot:status_changed → 更新对应 Bot 卡片状态

  PENDING 列: orders.filter(status !== 'COMPLETE') — 包含 PENDING 和 PROCESSING
```

### 测试策略

| 层级 | 工具 | 范围 |
|------|------|------|
| Domain 单元测试 | Vitest | OrderProcessingEngine 全部方法，纯逻辑无需 mock |
| API 集成测试 | Vitest + supertest | Express 路由 + WebSocket 连接 |
| 前端组件单元测试 | Vitest + React Testing Library | 组件渲染、hook 行为、api 服务层 mock |
| 前端 e2e | Playwright | 完整用户故事：创建订单 → 排队 → 完成 → Bot 管理 |

## Risks / Trade-offs

- **setTimeout 模拟 10 秒处理** → 测试中使用 sinon/fakeTimers 控制时间
- **WebSocket 仅推送完成事件** → 前端刷新负担小，WS 消息量少，适合原型
- **内存存储** → 服务重启数据丢失，符合原型要求
- **单线程 Node.js** → 天然避免并发问题
