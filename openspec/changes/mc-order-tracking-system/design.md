## Context

本项目是麦当劳订单追踪系统的前端原型，纯客户端运行。所有订单全局可见，无需用户登录。引入顾客/经理角色切换，经理独占机器人管理权限。所有订单和机器人事件通过活动日志追踪。使用 React + Vite 构建。

## Goals / Non-Goals

**Goals:**
- React SPA，直观展示订单从 PENDING → PROCESSING → COMPLETE 的流转
- 顾客角色：创建 Normal/VIP 订单，查看 PENDING 和 COMPLETE 区域
- 经理角色：顾客所有权限 + 管理机器人（+/- Bot）+ 查看活动日志
- 支持普通订单和 VIP 订单，VIP 订单自动优先处理
- 支持动态增减机器人，机器人自动从队列取单处理
- 处理时间为 10 秒/单（可配置常量 `PROCESSING_TIME_MS`）
- 机器人销毁时，处理中的订单回到 PENDING 队列原位置
- 所有订单创建、处理、退回、机器人增减事件记录到活动日志

**Non-Goals:**
- 无数据持久化（刷新即丢失）
- 无后端 API / 数据库
- 无真实用户认证
- 无动画效果（保持简洁）

## Decisions

### 1. 技术选型：React + Vite

**选择**：React 18 + Vite + 原生 CSS（不使用 UI 框架）。

**理由**：组件化适合订单卡片、机器人面板、日志面板等可复用 UI；Vite 零配置快速启动；不引入 UI 框架保持样式可控。

### 2. 组件树结构

```
App
├── RoleSwitcher        // 角色切换：顾客 | 经理
├── ControlPanel        // 控制面板
│   ├── OrderButtons    // New Normal Order / New VIP Order 按钮（所有角色可用）
│   └── BotManager      // +Bot / -Bot 按钮 + 机器人状态列表（仅经理可见）
├── PendingArea         // PENDING 区域 — 显示所有 pending 订单
│   └── OrderCard[]     // 订单卡片（订单号、类型标签）
├── CompleteArea        // COMPLETE 区域 — 显示所有 completed 订单
│   └── OrderCard[]
└── ActivityLog         // 活动日志面板 — 时间线展示事件（仅经理可见）
    └── LogEntry[]      // 日志条目（时间戳、事件图标、描述）
```

### 3. 状态管理

**选择**：React Context + useReducer 管理全局状态。

**Store 结构**：
```js
{
  role: 'customer' | 'manager',   // 当前角色
  vipQueue: Order[],              // VIP 待处理队列（FIFO）
  normalQueue: Order[],           // Normal 待处理队列（FIFO）
  completedOrders: Order[],       // 已完成订单列表
  bots: Bot[],                    // 机器人池
  orderIdCounter: number,         // 订单号自增计数器
  botIdCounter: number,           // 机器人 ID 计数器
  logs: LogEntry[]                // 活动日志
}
```

**订单数据结构**：
```
{
  id: number,              // 唯一递增
  type: 'normal' | 'vip',
  status: 'pending' | 'processing' | 'completed',
  botId: number | null,    // 正在处理的机器人 ID
  createdAt: Date          // 创建时间（用于日志）
}
```

**机器人数据结构**：
```
{
  id: number,
  status: 'idle' | 'processing',
  currentOrderId: number | null,
  timerId: number | null
}
```

**日志条目数据结构**：
```
{
  id: number,
  timestamp: Date,
  event: 'ORDER_CREATED' | 'ORDER_PROCESSING' | 'ORDER_COMPLETED' | 'ORDER_RETURNED'
        | 'BOT_CREATED' | 'BOT_DESTROYED',
  orderId: number | null,
  botId: number | null,
  message: string
}
```

### 4. 角色权限控制

| 操作 | 顾客 | 经理 |
|---|---|---|
| 创建 Normal/VIP 订单 | 可 | 可 |
| 查看 PENDING/COMPLETE | 可 | 可 |
| 查看机器人状态 | 可 | 可 |
| 增加/减少机器人 (+/- Bot) | **不可** | 可 |
| 查看活动日志 | **不可** | 可 |

**实现**：BotManager 和 ActivityLog 组件根据 `role === 'manager'` 条件渲染。RoleSwitcher 为简单的 toggle 按钮组。

### 5. 活动日志机制

**选择**：在 dispatch 每个 action 时同步调用 `addLog()` 辅助函数，向 logs 数组追加条目。

**日志事件与触发时机**：
| 事件 | 触发时机 | 消息格式 |
|---|---|---|
| ORDER_CREATED | 创建订单 | `订单 #N (VIP/Normal) 已创建` |
| ORDER_PROCESSING | 机器人取单 | `机器人 #M 开始处理订单 #N` |
| ORDER_COMPLETED | 10 秒处理完成 | `订单 #N 已完成，由机器人 #M 处理` |
| ORDER_RETURNED | 机器人销毁退回 | `订单 #N 退回 PENDING（机器人 #M 已销毁）` |
| BOT_CREATED | +Bot | `机器人 #M 已上线` |
| BOT_DESTROYED | -Bot | `机器人 #M 已下线` |

日志面板以倒序展示（最新在上），自动滚动。日志仅存于内存，刷新丢失。

### 6. 双队列架构

**选择**：使用两个独立队列 `vipQueue` 和 `normalQueue`，而非单一队列遍历插入。

**入队规则**：
- 新建 VIP 订单 → `vipQueue.push(order)`（追加到 VIP 队尾）
- 新建 Normal 订单 → `normalQueue.push(order)`（追加到 Normal 队尾）

**出队规则（机器人取单）**：
- 优先从 `vipQueue` 队首取单（`vipQueue.shift()`）
- 若 `vipQueue` 为空，则从 `normalQueue` 队首取单（`normalQueue.shift()`）

**PENDING 展示**：
- UI 渲染时拼接：`[...vipQueue, ...normalQueue]`
- 结果：所有 VIP 在前（按创建时间升序），所有 Normal 在后（按创建时间升序）

**订单退回**：
- VIP 订单退回时 → 使用 `vipQueue.unshift(order)` 放回 VIP 队首（保持原位置语义，因为它是被中断的订单，应优先于后来者）
- Normal 订单退回时 → 使用 `normalQueue.unshift(order)` 放回 Normal 队首

**理由**：双队列将 VIP/Normal 物理隔离，取单和入队均为 O(1)，无需遍历查找插入位置。语义清晰，不易出错。

### 7. 机器人处理循环

**选择**：每个机器人使用 `setTimeout` 链式调用（处理完一个后再取下一个）。

**理由**：比 `setInterval` 更灵活，销毁时易于 `clearTimeout`。使用 `useRef` 保存 timer 引用避免闭包陷阱。

### 8. 机器人销毁策略

**选择**：销毁最新创建的机器人（LIFO）。若有进行中订单，清除 timer，将订单状态重置回 pending 并按类型放回对应队列队首。

## Risks / Trade-offs

- **React 重渲染**：订单/日志频繁更新 → 使用 `React.memo` 优化 OrderCard、LogEntry
- **Timer 与组件生命周期**：组件卸载时需清理 timer → useEffect cleanup 中处理
- **日志内存增长**：长时间运行日志数组可能变大 → 限制最多保留 200 条，超出移除旧条目
- **退回订单的位置语义**：`unshift` 退回队首意味着退回的订单会优先于队列中其他同类型订单被处理。如果需求是退回原位置（在特定订单之后），则需额外记录位置信息，当前原型采用简单的队首退回策略
