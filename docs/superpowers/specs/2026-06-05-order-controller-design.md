# McDonald's 订单控制器 — 设计文档

## 概述

麦当劳自动化烹饪机器人订单管理 CLI 应用。处理订单排队（VIP/普通）、机器人生命周期管理和并发订单处理。

---

## 系统架构

```
┌────────────────────────────────────────────────────────────┐
│                       cmd/main.go                          │
│         TTY 检测 → ┌──────────────┐                       │
│                    │ 交互模式     │  REPL 命令循环         │
│          TTY ─────→│              │                       │
│                    │ normal vip   │                       │
│                    │ +bot  -bot   │                       │
│                    │ status exit  │                       │
│                    └──────────────┘                       │
│                       非 TTY                              │
│                    ┌──────────────┐                       │
│     --simulate ───→│ 模拟模式     │  预设场景自动执行     │
│                    │              │  → result.txt         │
│                    └──────────────┘                       │
└───────────────────────────┬────────────────────────────────┘
                            │ 调用
┌───────────────────────────▼────────────────────────────────┐
│               internal/controller/                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Controller                                          │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────┐ │  │
│  │  │ vipQueue  │  │ normalQueue  │  │    bots[]      │ │  │
│  │  │ [V1, V2]  │  │ [N1, N2, N3] │  │ [Bot#1, Bot#2] │ │  │
│  │  └──────────┘  └──────────────┘  └───────┬────────┘ │  │
│  │                                          │          │  │
│  │  sync.Mutex ─── 保护所有状态              │          │  │
│  │  orderCh    ─── 订单到达信号（唤醒空闲bot）│          │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                                                            │
┌────────────────────────────────────────────────────────────┐
│  Bot goroutines（每个机器人独立协程）                      │
│                                                           │
│  ┌─────────────────┐    ┌─────────────────┐              │
│  │  Bot #1          │    │  Bot #2          │              │
│  │  ┌─────────────┐ │    │  ┌─────────────┐ │              │
│  │  │ goroutine   │ │    │  │ goroutine   │ │              │
│  │  │ time.After │ │    │  │ time.After │ │              │
│  │  │ (10s)       │ │    │  │ (10s)       │ │              │
│  │  └─────────────┘ │    │  └─────────────┘ │              │
│  │  stopCh ──────── │    │  stopCh ──────── │              │
│  └─────────────────┘    └─────────────────┘              │
└────────────────────────────────────────────────────────────┘
```

---

## 模式检测

```
程序启动
  │
  ├── os.Args 包含 "--simulate" ──→ 模拟模式
  │
  └── 检查 os.Stdout 是否为 TTY
        │
        ├── 是 TTY ──→ 交互模式（REPL）
        │
        └── 非 TTY ──→ 模拟模式（CI 自动执行）
```

---

## 数据结构

### 订单 (Order)

| 字段 | 类型 | 说明 |
|------|------|------|
| ID | `int` | 唯一自增，从 1001 开始 |
| Type | `OrderType` | Normal 或 VIP |
| Status | `OrderStatus` | PENDING → PROCESSING → COMPLETE |
| CreatedAt | `time.Time` | 创建时间 |
| StartedAt | `*time.Time` | bot 开始处理的时间（nil 表示尚未处理） |

### 机器人 (Bot)

| 字段 | 类型 | 说明 |
|------|------|------|
| ID | `int` | 唯一自增，从 1 开始 |
| order | `*Order` | 当前处理的订单（空闲时为 nil） |
| stopCh | `chan struct{}` | 移除信号，关闭后 goroutine 退出 |

---

## 队列设计

### 双队列模型

```
         取订单方向 ────→
         ┌──────────────────────────────────┐
         │  vipQueue: [V1] → [V2] → [V3]   │  ← 优先处理
         └──────────────────────────────────┘
         ┌──────────────────────────────────┐
         │  normalQueue: [N1] → [N2] → [N3] │  ← vipQueue 为空时才处理
         └──────────────────────────────────┘
```

### VIP 订单插入算法

VIP 订单始终插入到 vipQueue 尾部（即所有现有 VIP 之后），但排在所有 Normal 之前。

```
初始状态：
  vipQueue:    [V1]
  normalQueue: [N1, N2]

操作：添加 VIP 订单 V2

  vipQueue:    [V1] → [V2]    ← 追加到 VIP 队列尾部
  normalQueue: [N1, N2]       ← 不变

处理顺序：V1 → V2 → N1 → N2
```

```
初始状态：
  vipQueue:    []
  normalQueue: [N1, N2]

操作：添加 VIP 订单 V1

  vipQueue:    [V1]           ← 追加到空 VIP 队列
  normalQueue: [N1, N2]       ← 不变

处理顺序：V1 → N1 → N2
```

### 订单回退算法（bot 被移除时）

当 `-bot` 中断处理中的 bot 时，订单回到**对应队列的头部**。

```
处理中状态：
  vipQueue:    [V2]
  normalQueue: [N2, N3]
  Bot#1 正在处理 N1

操作：-bot（移除 Bot#1）

  N1 回到 normalQueue 头部：
  vipQueue:    [V2]
  normalQueue: [N1] → [N2] → [N3]

  下一个空闲 bot 会先取 V2（VIP 优先），然后 N1, N2, N3
```

---

## 并发模型

```
┌──────────────────────────────────────────────────────────┐
│                       Controller                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  sync.Mutex                                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │  │
│  │  │ vipQueue  │  │normalQue │  │ bots             │ │  │
│  │  │ (slice)   │  │ (slice)  │  │ (slice)          │ │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  orderCh (chan struct{}, buffer=1)                      │
│  ─── 用于唤醒空闲 bot                                     │
│      非阻塞发送，有 idle bot 则触发，无则丢弃               │
└──────────────────────────────────────────────────────────┘
```

### Bot 完整生命周期

```
创建 Bot
  │
  ▼
┌──────────────────────────────────────────────────────┐
│  Bot Loop (goroutine)                                │
│                                                      │
│  加锁                                                │
│  取订单 ──→ vipQueue 有? ──→ 取 vipQueue[0]         │
│            │                                          │
│            无                                         │
│            ▼                                          │
│            normalQueue 有? ──→ 取 normalQueue[0]     │
│            │                                          │
│            无                                         │
│            ▼                                          │
│  解锁                                                │
│  ┌──────────────────────────────────────────┐        │
│  │ select {                                 │        │
│  │   case <-orderCh:  → 重新尝试取订单      │        │
│  │   case <-stopCh:   → 退出 goroutine      │        │
│  │ }                                        │        │
│  └──────────────────────────────────────────┘        │
│            │                                          │
│  取到订单 ↓                                          │
│  订单 → PROCESSING                                    │
│  bot.order = 订单                                     │
│  解锁                                                │
│                                                      │
│  ┌──────────────────────────────────────────┐        │
│  │ select {                                 │        │
│  │   case <-time.After(10s): → 处理完成     │        │
│  │   case <-stopCh:          → 被中断       │        │
│  │ }                                        │        │
│  └──────────────────────────────────────────┘        │
│            │              │                           │
│        完成 ↓            中断 ↓                      │
│  加锁             加锁                                │
│  订单→COMPLETE    订单回到对应队列头部                 │
│  bot.order=nil    bot.order=nil                       │
│  解锁             解锁                                │
│  回到循环顶部     return（goroutine 结束）             │
└──────────────────────────────────────────────────────┘
```

### 时序示例：双 bot 处理 VIP + Normal 订单

```
时间     操作
│
├─ 0s    Normal #1001 added → PENDING
├─ 1s    VIP #1002 added → PENDING
├─ 2s    Normal #1003 added → PENDING
│
├─ 3s    Bot #1 added
│        └─ 取 VIP #1002 → PROCESSING
├─ 4s    Bot #2 added
│        └─ 取 Normal #1001 → PROCESSING
│
├─13s    Bot #1 完成 VIP #1002 → COMPLETE
│        └─ 取 Normal #1003 → PROCESSING
├─14s    Bot #2 完成 Normal #1001 → COMPLETE
│        └─ 队列空 → IDLE
│
├─15s    VIP #1004 added → PENDING
│        └─ 唤醒 Bot #2 → 取 VIP #1004 → PROCESSING
│
├─23s    Bot #1 完成 Normal #1003 → COMPLETE
│        └─ 队列空 → IDLE
├─25s    Bot #2 完成 VIP #1004 → COMPLETE
│        └─ 队列空 → IDLE
│
├─25s    -bot: 移除 Bot #2（空闲中）
└─26s    -bot: 移除 Bot #1（空闲中）
```

---

## 核心操作伪代码

### AddNormalOrder

```
func AddNormalOrder():
    lock()
    order = new Order(type=Normal, id=nextID++)
    normalQueue.append(order)
    unlock()
    notifyIdleBots()   // 非阻塞发送 orderCh
    return order
```

### AddVIPOrder

```
func AddVIPOrder():
    lock()
    order = new Order(type=VIP, id=nextID++)
    vipQueue.append(order)       // 追加到 VIP 队列尾部
    unlock()
    notifyIdleBots()
    return order
```

### AddBot

```
func AddBot():
    lock()
    bot = new Bot(id=nextID++)
    bots.append(bot)
    start botLoop(bot)           // go botLoop(bot)
    unlock()
    return bot
```

### RemoveBot

```
func RemoveBot():
    lock()
    if bots is empty: unlock(); return nil
    bot = bots.pop()             // 移除最后一个（最新）
    close(bot.stopCh)            // 通知 goroutine 退出
    if bot.order != nil:
        // 订单回退到对应队列头部
        if bot.order.type == VIP:
            vipQueue.prepend(bot.order)
        else:
            normalQueue.prepend(bot.order)
        bot.order = nil
    unlock()
    return bot
```

### Status

```
func Status():
    lock()
    统计 pending/processing/completed 数量
    列出 vipQueue 和 normalQueue
    列出每个 bot 及其状态
    unlock()
    return 格式化字符串
```

---

## 交互模式 (Interactive)

### 命令列表

| 命令 | 别名 | 说明 |
|------|------|------|
| `normal` | `n` | 添加普通订单 |
| `vip` | `v` | 添加 VIP 订单 |
| `+bot` | `bot+` | 添加机器人 |
| `-bot` | `bot-` | 移除最新的机器人 |
| `status` | `s` | 显示当前系统状态 |
| `help` | `h` | 显示帮助信息 |
| `exit` | `quit` / `q` | 退出程序 |

### 交互示例

```
McDonald's Order Controller (type 'help' for commands)
> n
[14:32:01] Normal Order #1001 added → PENDING
> v
[14:32:02] VIP Order #1002 added → PENDING
> +bot
[14:32:03] Bot #1 created → PROCESSING VIP Order #1002
> +bot
[14:32:04] Bot #2 created → PROCESSING Normal Order #1001
> s
═══════════════════════════════════════
Orders: 0 pending, 2 processing, 0 completed
Queue: [Normal #1003]
Bots:  #1(active)  #2(active)
═══════════════════════════════════════
> -bot
[14:32:10] Bot #2 removed (was processing Normal #1001)
[14:32:10] Normal Order #1001 returned → PENDING
> q
```

### 异步事件输出

Bot 完成订单时自动输出到终端，不影响命令输入：

```
> n
[14:32:01] Normal Order #1001 added → PENDING
[14:32:05] Bot #1 completed VIP Order #1002 → COMPLETE    ← 自动推送
[14:32:05] Bot #1 started Normal Order #1003 → PROCESSING ← 自动推送
```

---

## 模拟模式 (Simulation)

### 预设场景

```
1. 初始化系统（0 bots）
2. 添加 Normal Order #1001  → PENDING
3. 添加 VIP Order #1002    → PENDING
4. 添加 Normal Order #1003  → PENDING
5. 添加 Bot #1  → 处理 VIP #1002
6. 添加 Bot #2  → 处理 Normal #1001
7. → 等待完成 → Bot #1 完成 VIP #1002，取 Normal #1003
8. → 等待完成 → Bot #2 完成 Normal #1001，空闲
9. 添加 VIP Order #1004    → Bot #2 被唤醒，处理 VIP #1004
10. → 等待完成 → Bot #1 完成 Normal #1003，空闲
11. → 等待完成 → Bot #2 完成 VIP #1004，空闲
12. 移除 Bot #2（空闲中）
13. 输出最终状态
```

### 输出格式

```
[14:32:01] System initialized with 0 bots
[14:32:01] Normal Order #1001 added → PENDING
[14:32:02] VIP Order #1002 added → PENDING
...
[14:32:25] Bot #2 removed (was idle)

Final Status:
- Total Orders: 4 (2 VIP, 2 Normal)
- Completed: 4
- Active Bots: 1
- Pending: 0
```

总执行时间约 25 秒（4 个订单 × 10 秒，双 bot 并行）。

---

## 测试计划

### 单元测试（controller 包）

```
TestAddNormalOrder
  → normalQueue 增加一条，ID 递增

TestAddVIPOrder
  → vipQueue 增加一条，排在现有 VIP 之后

TestBotPicksVIPFirst
  → vipQueue 和 normalQueue 都有订单时，bot 取 VIP

TestBotProcessesOrder
  → bot 处理订单约 10 秒后状态变为 COMPLETE

TestRemoveIdleBot
  → bots 数量减少

TestRemoveActiveBot
  → 订单回到队列头部

TestMultipleBots
  → 多 bot 并行处理不冲突

TestOrderIDsSequential
  → 订单 ID 连续不重复
```

---

## 非目标

- 无数据持久化（纯内存）
- 无 Web UI
- 无认证/授权
- 无分布式/多餐厅支持
- 无配置文件

---

## 文件清单

```
scripts/
├── build.sh      # go build -o order-controller ./cmd/main.go
├── run.sh        # ./order-controller > result.txt
└── test.sh       # go test ./...

cmd/
└── main.go       # 入口

internal/
├── controller/
│   ├── controller.go     # 核心逻辑
│   └── controller_test.go # 单元测试
└── simulation/
    └── simulation.go     # 模拟场景

go.mod / go.sum
```
