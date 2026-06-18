# McDonald's 订单控制器 — 设计方案

> **关联文档**：[需求文档](./requirements.md)  
> **实现路径**：前端（Vue 3 + TypeScript）  
> **文档版本**：v2.2  
> **最后更新**：2026-06-17

---

## 1. 设计目标

在满足 [requirements.md](./requirements.md) 全部功能需求的前提下：

- **核心是一个 `OrderController`（调度器）**，与官方题目表述一致
- **`Bot` 类负责接单、计时、完成回调**；Controller 负责入队、派单、完成后的下一单
- 业务逻辑与 Vue UI 分离，domain 层可单测
- 代码量少、结构清晰，避免过度工程化

**刻意不做**：独立状态机框架、Registry 注册表、副作用映射表、Queue/BotPool/Scheduler 多文件拆分。

---

## 2. 架构分层

```text
┌─────────────────────────────────────────┐
│  Presentation（Vue 组件）                │
│  ActionBar、BotSummaryBar、三块订单面板   │
└──────────────────┬──────────────────────┘
                   │ 调用 useKitchen 方法
┌──────────────────▼──────────────────────┐
│  Application（useKitchen composable）    │
│  持有 OrderController；同步 snapshot       │
│  每秒 refresh（倒计时 UI）               │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  Domain（纯 TypeScript）                 │
│  OrderController + Bot + types + constants │
└─────────────────────────────────────────┘
```

### 各层职责

| 层 | 职责 | 禁止 |
|----|------|------|
| Presentation | 展示、用户交互 | 直接改 `order.status`；写 VIP 插队规则 |
| Application | 桥接 UI 与 Controller；定时 refresh UI | 业务规则；管理烹饪 timer |
| Domain | 排队、调度、Bot 派单与完成 | 依赖 Vue / DOM |

**10 秒 timer 在 `Bot.startWork()` 内**，不在 composable。

---

## 3. 文件结构

```text
src/
  domain/
    types.ts
    constants.ts
    bot.ts                     # Bot 类（计时 + 状态）
    order-controller.ts        # 调度器
    order-controller.test.ts
  composables/
    useKitchen.ts
  components/
    ActionBar.vue
    BotSummaryBar.vue          # 按钮下：Bot 总数 / Processing / Idle
    PendingBoard.vue
    ProcessingBoard.vue        # 处理中订单（订单视角）
    CompleteBoard.vue
  App.vue
  style.css                    # 共用 .panel 样式
docs/
  requirements.md
  design.md
```

### 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Vue 3 + TypeScript |
| 构建 | Vite |
| 测试 | Vitest |
| 部署 | Vercel / Netlify |

---

## 4. 类型与常量

### 4.1 types.ts

```text
CustomerRole = 'vip' | 'normal'
OrderStatus  = 'pending' | 'processing' | 'complete'
BotStatus    = 'idle' | 'processing'

Order {
  id, role, status, sequence
  completedAt?: string      // HH:MM:SS，展示用
  completedAtMs?: number    // 完成时间排序用
}

BotSnapshot {
  id, status, currentOrderId?, remainingSeconds?
}

BotStats { total, idle, processing }

ProcessingOrderView {
  id, role, botId, remainingSeconds, startedAt
}

KitchenSnapshot { orders, bots: BotSnapshot[], completed }
```

### 4.2 constants.ts

```text
ROLE_PRIORITY = { vip: 1, normal: 2 }
ROLE_LABEL / STATUS_LABEL
PROCESSING_SECONDS = 10
INITIAL_ORDER_ID   = 1001
```

---

## 5. Bot 类（bot.ts）

Bot 负责 **干活 + 计时**，不依赖 Vue。

| 方法 | 说明 |
|------|------|
| `startWork(orderId, onComplete)` | 进入 processing，启动 10s timer，到点回调 |
| `cancelWork()` | 清除 timer，回到 idle（减 Bot 时用，不触发 onComplete） |
| `release()` | 完成一单后回到 idle |
| `isIdle()` / `isProcessing()` | 状态查询 |
| `getRemainingSeconds()` | 倒计时（UI） |
| `getStartedAt()` | 开始烹饪时间戳（Processing 列表排序） |
| `toSnapshot()` | 供 getSnapshot 使用 |

---

## 6. OrderController（调度器）

### 6.1 内部状态

```text
OrderController
  segments: Map<number, Order[]>   // 仅 PENDING 队列，按 priority 分段
  allOrders: Order[]               // 全部订单注册表（按 id 查找）
  bots: Bot[]
  completed: Order[]
  nextOrderId / nextBotId / nextSequence
  onStateChange?: () => void       // 状态变更通知 UI
```

### 6.2 对外 API

| 方法 | 说明 |
|------|------|
| `addNormalOrder()` / `addVipOrder()` | 新建订单并入队 |
| `addBot()` | 新增 1 个 Bot，并派单 |
| `removeBot()` | 移除 **最新创建** 的 Bot |
| `getSnapshot()` | 全量快照 |
| `getPendingOrders()` | PENDING 队列（priority + FIFO 顺序） |
| `getProcessingOrders()` | 处理中订单视图，**按 startedAt 升序** |
| `getCompletedOrders()` | 已完成订单，**按 completedAtMs 升序** |
| `getBotStats()` | total / idle / processing 数量 |
| `destroy()` | 组件卸载时取消所有 Bot timer |

### 6.3 私有方法

| 方法 | 说明 |
|------|------|
| `enqueue(order)` | 按 role priority 入队尾 |
| `dequeueNext()` | 按 priority 升序取队首 |
| `reinsert(order)` | 同 priority 段内按 **sequence** 插回原位 |
| `dispatchToIdleBots()` | 遍历 idle Bot 派单 |
| `dispatchToBot(bot)` | 取单 → `order.status=processing` → `bot.startWork(...)` |
| `handleBotFinished(bot)` | 订单 complete → `bot.release()` → 继续 `dispatchToBot` |
| `findOrder(id)` | 在 allOrders 中查找 |

---

## 7. 关键流程

### 7.1 新建订单

```text
addVipOrder() / addNormalOrder()
  → 创建 Order（pending）→ allOrders + enqueue
  → dispatchToIdleBots()
  → notify()
```

### 7.2 派单与计时

```text
dispatchToBot(bot)
  → order = dequeueNext()
  → order.status = processing
  → bot.startWork(order.id, () => handleBotFinished(bot))
      └── Bot 内部 setTimeout(10s)
```

### 7.3 烹饪完成

```text
handleBotFinished(bot)        // Bot timer 回调
  → order.status = complete，写 completedAt / completedAtMs
  → bot.release()
  → dispatchToBot(bot)        // 同一 Bot 继续下一单
  → notify()
```

### 7.4 减 Bot

```text
removeBot()
  → bot = bots[最后一个]       // 最新创建的 Bot
  → 若 processing：
       bot.cancelWork()         // 停 timer，不触发完成
       order.status = pending
       reinsert(order)          // 按 sequence 回原位
  → 从 bots 移除
  → notify()
```

### 7.5 取单顺序（dequeueNext）

按 `ROLE_PRIORITY` 升序遍历 segments，取第一个非空段队首；不写 `if (vip) else if (normal)`。

### 7.6 回队（reinsert）

在同 priority 段内，插入到第一个 `sequence` 更大的订单之前；**不用数组 index / restoreAnchor**。

---

## 8. 前端集成

### 8.1 useKitchen（薄桥接）

```text
controller = new OrderController(() => { snapshot = controller.getSnapshot() })

addNormalOrder()  → controller.addNormalOrder()   // notify 自动刷新
addBot()          → controller.addBot()
removeBot()       → controller.removeBot()

pendingOrders()     → controller.getPendingOrders()
processingOrders()  → controller.getProcessingOrders()
completedOrders()   → controller.getCompletedOrders()
botStats()          → controller.getBotStats()

setInterval(1s)   → getSnapshot()               // 刷新 Bot 倒计时
onUnmounted       → controller.destroy()
```

**composable 不管理烹饪 timer。**

### 8.2 UI 布局

```text
[ ActionBar：New Normal / VIP / +Bot / −Bot ]

[ BotSummaryBar：Total Bots | Processing (N) | Idle (M) ]

┌─────────────┬─────────────┬─────────────┐
│  Pending    │ Processing  │  Complete   │
│  排队订单    │  处理中订单  │  已完成订单  │
└─────────────┴─────────────┴─────────────┘
```

| 面板 | 数据 | 排序 |
|------|------|------|
| Pending | `getPendingOrders()` | 队列 priority + FIFO |
| Processing | `getProcessingOrders()` | **startedAt 升序** |
| Complete | `getCompletedOrders()` | **completedAtMs 升序** |

三块面板固定 **height: 600px**，`.panel-body` 内 **overflow-y: auto** 滚动。

---

## 9. 状态变更规则（轻量，无独立状态机类）

### 订单

| 从 | 到 | 触发位置 |
|----|-----|----------|
| — | pending | `addOrder` |
| pending | processing | `dispatchToBot` |
| processing | complete | `handleBotFinished` |
| processing | pending | `removeBot`（减 Bot 回队） |

### Bot

| 从 | 到 | 触发位置 |
|----|-----|----------|
| — | idle | `addBot` 创建 |
| idle | processing | `startWork` |
| processing | idle | `release` / `cancelWork` |
| 任意 | 移除 | `removeBot` |

---

## 10. 编码约束

| 规则 | 做法 |
|------|------|
| 排队优先级 | `dequeueNext` 遍历 priority |
| 回队 | 按 `sequence` 插入 |
| 减 Bot | 删 `bots[bots.length - 1]` |
| 烹饪 timer | 只在 `Bot.startWork` |
| UI | 只调 composable → controller |
| 状态变更 | 集中在 Controller + Bot，不散落 Vue 组件 |

---

## 11. 扩展方式

| 需求 | 改哪里 |
|------|--------|
| SVIP | `constants.ts` 加 priority + 按钮 |
| 取消订单 | Order 状态 + Controller 方法 |
| 处理时长 | `PROCESSING_SECONDS` 或 Bot 入参 |

---

## 12. 测试建议

`order-controller.test.ts` 覆盖：

| 场景 | 验证点 |
|------|--------|
| VIP 插队 | `getPendingOrders` 顺序 |
| 多 Bot 减 Bot 回队 | `sequence` 顺序 |
| 处理中插单再减 Bot | 回队位置 |

测试不依赖 Vue、不等待真实 10s（当前测试未覆盖 timer 完成路径；可后续 mock Bot 回调）。

---

## 13. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-06-17 | Registry + 双状态机方案 |
| v2.0 | 2026-06-17 | 精简为 OrderController 核心 |
| v2.1 | 2026-06-17 | 回队按 sequence；移除 restoreAnchor |
| v2.2 | 2026-06-17 | 与代码对齐：Bot 类管 timer；ProcessingBoard/BotSummaryBar；查询 API；排序与 UI 布局 |
