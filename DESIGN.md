# 麦当劳订单控制系统 — 设计文档

## 1. 概述

本系统实现麦当劳自动化烹饪机器人的订单控制器，采用 **Go 语言 CLI 后端**方案。系统在内存中管理订单队列与机器人生命周期，运行预设的模拟场景并将结果输出到 `stdout`，完全满足 README 中的所有需求。

## 2. 核心概念映射

| 用户故事 | 系统实现 |
|---------|---------|
| 普通客户提交订单 → 进入 PENDING | `OrderController.AddNormalOrder()` |
| VIP 客户提交订单 → 插入 VIP 优先位置 | `OrderController.AddVIPOrder()` |
| 经理增减机器人 | `OrderController.AddBot()` / `RemoveNewestBot()` |
| 机器人 10 秒处理一个订单 | goroutine + `time.Sleep(10s)` |
| 机器人空闲时等待新订单 | `idleBots` FIFO 队列 + `orderCh` channel 派单 |
| 销毁机器人时订单回归原位 | 按订单 ID 升序插回对应队列，保证原始 FIFO 位置 |

## 3. 项目结构

```
order-controller/
├── main.go                    # 入口 + 模拟场景
├── controller.go              # 核心类型与 OrderController 逻辑
├── controller_test.go         # 单元测试（19 个）
├── go.mod                     # Go module 定义
├── go.sum                     # 依赖锁定
└── scripts/
    ├── build.sh               # 编译 CLI
    ├── run.sh                 # 运行 CLI
    ├── test.sh                # 执行单元测试（含 -race 数据竞争检测）
    └── result.txt             # 运行输出 (gitignore 控制)
```

所有 Go 代码位于 `package main`，平铺结构，无内部子包。

## 4. 数据结构设计

### 4.1 常量 & 类型

```go
type OrderType string
const (
    OrderNormal OrderType = "NORMAL"
    OrderVIP    OrderType = "VIP"
)

type OrderStatus string
const (
    StatusPending    OrderStatus = "PENDING"
    StatusProcessing OrderStatus = "PROCESSING"
    StatusComplete   OrderStatus = "COMPLETE"
)

type BotStatus string
const (
    BotIdle       BotStatus = "IDLE"
    BotProcessing BotStatus = "PROCESSING"
)
```

### 4.2 Order（订单）

```go
type Order struct {
    ID     int         // 自增唯一编号
    Type   OrderType   // NORMAL / VIP
    Status OrderStatus // PENDING / PROCESSING / COMPLETE
}
```

### 4.3 Bot（机器人）

Bot 是独立的工作实体，每个 Bot 在自己的 goroutine 中运行。Controller 通过 `orderCh` 派单，通过 `stopCh` 发停止信号。Bot 持有对 Controller 的直接引用，用于完成后回调通知。

```go
type Bot struct {
    ID           int
    Status       BotStatus
    CurrentOrder *Order
    orderCh      chan *Order      // 接收 Controller 派发的订单（缓冲 1）
    stopCh       chan struct{}    // 接收停止信号
    controller   *OrderController // 回调通知 Controller 订单完成/停止
}
```

### 4.4 OrderController（订单控制器 — 核心）

```go
type OrderController struct {
    mu             sync.Mutex    // 保护并发访问
    vipPending     []*Order      // VIP 待处理队列（FIFO）
    normalPending  []*Order      // 普通待处理队列（FIFO）
    completed      []*Order      // 已完成订单
    bots           []*Bot        // 所有机器人列表（按创建顺序）
    idleBots       []*Bot        // 空闲机器人 FIFO 队列
    nextOrderID    int           // 下一个订单 ID
    nextBotID      int           // 下一个机器人 ID
    logWriter      io.Writer     // 日志输出目标
    processingTime time.Duration // 处理单个订单耗时（可配置，便于测试）
}
```

## 5. 双队列设计

### 5.1 队列分离策略

`vipPending` 和 `normalPending` 是两个独立的 FIFO 队列，逻辑清晰：

- **新增 VIP 订单**：直接 `append` 到 `vipPending` 末尾
- **新增 NORMAL 订单**：直接 `append` 到 `normalPending` 末尾
- **Bot 取单**：**先检查 `vipPending`**，有则取 `vipPending[0]`；`vipPending` 为空则取 `normalPending[0]`
- **订单回归**（Bot 被销毁时）：按**订单 ID 升序**插回对应队列，保证回归原始相对位置

### 5.2 订单回归的「原始位置」分析

需求要求 Bot 销毁时订单「返回原始位置」。由于队列总是从头部消费（FIFO），被取走的订单必然曾是队首。问题在于多个订单被取走后又归还时，先后顺序如何保证。

**关键洞察**：订单 ID 是自增且唯一的，天然携带创建顺序。回归时按 ID 升序插入即可恢复原始 FIFO 位置。

#### 示例：证明按 ID 插入的正确性

```
初始: vipPending=[VIP#1(id=1001), VIP#2(id=1002), VIP#3(id=1003)]

Bot1 取 VIP#1(1001) → vipPending=[VIP#2(1002), VIP#3(1003)]
Bot2 取 VIP#2(1002) → vipPending=[VIP#3(1003)]

Bot1 被销毁，VIP#1 回归:
  扫描 vipPending=[VIP#3(1003)]
  1001 < 1003 → 插入索引 0
  vipPending=[VIP#1(1001), VIP#3(1003)]  ✓

Bot2 被销毁，VIP#2 回归:
  扫描 vipPending=[VIP#1(1001), VIP#3(1003)]
  1002 > 1001, 1002 < 1003 → 插入索引 1
  vipPending=[VIP#1(1001), VIP#2(1002), VIP#3(1003)]  ✓ 完全恢复原始顺序
```

### 5.3 入队/出队方法

```go
// dequeueOrder 从队列头部取出优先级最高的订单：VIP 优先（O(1)）
func (oc *OrderController) dequeueOrder() *Order

// returnOrder 订单回归：按订单 ID 升序插入对应队列，保证原始位置（O(n)）
func (oc *OrderController) returnOrder(order *Order)

// insertByID 按 ID 升序将订单插入队列正确位置
func (oc *OrderController) insertByID(queue []*Order, order *Order) []*Order
```

## 6. 核心业务流程

### 6.1 AddNormalOrder / AddVIPOrder

```
AddVIPOrder:
  1. 加锁
  2. nextOrderID++ → 创建 Order(Type=VIP)
  3. append 到 vipPending 末尾
  4. 写日志: "[HH:MM:SS] Created VIP Order #{ID} - Status: PENDING"
  5. dispatchToIdleBot() 尝试派单给空闲 Bot
  6. 解锁

AddNormalOrder:
  1. 加锁
  2. nextOrderID++ → 创建 Order(Type=NORMAL)
  3. append 到 normalPending 末尾
  4. 写日志: "[HH:MM:SS] Created Normal Order #{ID} - Status: PENDING"
  5. dispatchToIdleBot() 尝试派单给空闲 Bot
  6. 解锁
```

### 6.2 AddBot

```
1. 加锁
2. nextBotID++ → 创建 Bot（orderCh: chan *Order(1), stopCh: chan struct{}）
3. 追加到 bots 列表
4. 写日志: "[HH:MM:SS] Bot #{ID} created - Status: ACTIVE"
5. 启动 goroutine: go bot.run()
6. 尝试取单：dequeueOrder()
   - 有订单：设置状态 PROCESSING，通过 bot.orderCh <- order 派单
   - 无订单：加入 idleBots 队列，标记 IDLE
7. 解锁
```

### 6.3 Bot.run()（机器人主循环）

Bot 通过两个 channel 与 Controller 通信：从 `orderCh` 接收派单，从 `stopCh` 接收停止信号。处理订单时启动子 goroutine 执行 `time.Sleep` 模拟耗时操作。

```
loop:
  select {
    case order := <-b.orderCh:
      // 有订单到达 → 启动子 goroutine 模拟处理
      done := make(chan struct{})
      go func() {
          time.Sleep(b.controller.processingTime)  // 模拟 10s 处理
          close(done)
      }()

      select {
        case <-done:
          // 处理完成 → 回调 Controller.onOrderComplete()
        case <-b.stopCh:
          // 被中断 → 回调 Controller.onBotStopped(order)
          return
      }

    case <-b.stopCh:
      // 空闲时被销毁 → 回调 Controller.onBotStopped(nil)
      return
  }
```

### 6.4 RemoveNewestBot

移除最新创建的 Bot（LIFO：`bots[len(bots)-1]`）：

```
1. 加锁
2. 如果 bots 为空 → 解锁返回
3. 取出最后一个 Bot：bot := oc.bots[len(oc.bots)-1]
4. close(bot.stopCh) → 触发该 Bot run() 中的 stopCh case
5. 解锁
6. Bot 协程收到 stopCh 后自行清理：
   - 如果正在处理订单：回调 onBotStopped → returnOrder() 回归订单 → 从列表中移除
   - 如果空闲：回调 onBotStopped → 从 idleBots 和 bots 列表中移除
```

日志输出：
- 处理中销毁：`"Bot #{ID} destroyed while PROCESSING, Order #{OrderID} returned to PENDING"`
- 空闲时销毁：`"Bot #{ID} destroyed while IDLE"`

### 6.5 dispatchToIdleBot（派单给空闲 Bot）

```
（调用方已持有锁）
1. 如果 idleBots 为空 → 返回
2. 调用 dequeueOrder() 取最高优先级订单
3. 如果无订单 → 返回
4. 从 idleBots 头部取 Bot（FIFO，最早空闲优先）
5. 设置订单 PROCESSING、Bot PROCESSING → bot.orderCh <- order
6. 写日志: "[HH:MM:SS] Bot #{ID} picked up {Type} Order #{OrderID} - Status: PROCESSING"
```

## 7. 空闲 Bot 通知机制

当新订单到达或 Bot 完成订单后，通过 `idleBots` FIFO 队列 + `orderCh` channel 实现派单：

- **新订单到达**：`AddNormalOrder()` / `AddVIPOrder()` 结尾调用 `dispatchToIdleBot()`，从 `idleBots` 首部取 Bot，通过 `orderCh` 派单
- **Bot 完成订单**：`onOrderComplete()` 中尝试 `dequeueOrder()`，有单则通过 `orderCh` 续派，无单则加入 `idleBots`

这种设计避免了 `sync.Cond` 的复杂性，利用带缓冲 channel 实现可靠的订单派发。

## 8. 日志输出格式

所有日志使用 `[HH:MM:SS]` 格式的时间戳，基于服务器当前时间（`time.Now()`）：

```go
func (oc *OrderController) log(format string, args ...any) {
    fmt.Fprintf(oc.logWriter, "[%s] %s\n", time.Now().Format("15:04:05"), fmt.Sprintf(format, args...))
}
```

- `log(format, args...)`：带时间戳的日志
- `logRaw(format, args...)`：不带时间戳的纯文本日志（用于标题、汇总等）

## 9. CLI 模拟场景 (main.go)

### 9.1 运行模式

CLI 以非交互式方式运行预设的模拟场景，完整覆盖所有需求：

| 覆盖需求 | 场景体现 |
|---------|---------|
| 需求 1：新增 Normal Order | 步骤 2、4 |
| 需求 2：VIP 优先于 Normal | 步骤 3、Bot 取单顺序 |
| 需求 3：订单号唯一递增 | #1001 → #1002 → #1003 → #1004 |
| 需求 4：Bot 取单、10s 完成、继续取 | 步骤 5-11 |
| 需求 5：无单时 Bot IDLE | 步骤 12 Bot #1 IDLE |
| 需求 6：移除工作中 Bot，订单回归原位 | 步骤 7 |
| 需求 6：移除空闲 Bot | 步骤 14 |
| 需求 7：纯内存操作 | 全程无持久化 |

```
 1. 初始化系统（0 个 Bot）
 2. 创建 Normal Order #1001  → normalPending=[#1001]
 3. 创建 VIP Order #1002     → vipPending=[#1002]
 4. 创建 Normal Order #1003  → normalPending=[#1001, #1003]
 5. 增加 Bot #1 → 取 VIP #1002 开始处理（10s）
 6. 增加 Bot #2 → 取 Normal #1001 开始处理（10s）
 7. 移除 Bot #2（正在处理 Normal #1001）
    → Normal #1001 按 ID 升序回归 normalPending
    → normalPending=[#1001, #1003]  ← #1001 排在 #1003 前，原始位置正确
 8. 等待 Bot #1 完成 VIP #1002 → COMPLETE
    → Bot #1 立即取 Normal #1001 开始处理（10s）
 9. 创建 VIP Order #1004 → vipPending=[#1004]（无空闲 Bot，等待）
10. 等待 Bot #1 完成 Normal #1001 → COMPLETE
    → Bot #1 立即取 VIP #1004 开始处理（10s）
11. 增加 Bot #3 → 取 Normal #1003 开始处理（10s）
12. 等待 Bot #1 完成 VIP #1004 → COMPLETE → Bot #1 IDLE
13. 等待 Bot #3 完成 Normal #1003 → COMPLETE → Bot #3 IDLE
14. 移除 Bot #3（空闲中）→ 演示移除空闲 Bot
15. 移除 Bot #1（空闲中）
16. 打印 Final Status 汇总
```

### 9.2 时间线控制

- 正式运行：`NewOrderController(os.Stdout, 10*time.Second)` 使用真实 10 秒间隔
- 非处理等待用 `sleepBriefly()`（200ms），确保顺序的可观测性
- 关键等待点使用 `time.Sleep(10s)` 确保 Bot 完成处理
- 结束后调用 `WaitForIdle()` 确认所有工作完成

## 10. 单元测试设计 (controller_test.go)

测试使用短处理时间（100ms）加速，通过 `newTestController()` 工厂方法创建测试实例。共 19 个测试用例：

| 分类 | 测试用例 | 验证点 |
|------|---------|-------|
| 订单创建 | `TestAddNormalOrder` | 订单创建、ID 递增、进入 pending 队列 |
| 订单创建 | `TestAddVIPOrder` | VIP 订单正确进入 vipPending |
| 订单创建 | `TestOrderNumberUniqueAndIncreasing` | 订单号唯一且递增 |
| VIP 优先级 | `TestVIPPriority` | 混合插入后 Bot 优先取 VIP |
| VIP 优先级 | `TestBotPicksVIPBeforeNormal` | Bot 先完成 VIP 再取 Normal |
| 机器人生命周期 | `TestAddBot` | Bot 创建、立即取单进入 PROCESSING |
| 机器人生命周期 | `TestBotProcessingCompletesOrder` | 处理完成后订单 COMPLETE、Bot IDLE |
| 机器人生命周期 | `TestBotContinuesAfterCompletion` | Bot 完成一单后自动取下一单 |
| 机器人生命周期 | `TestBotBecomesIdleWhenNoOrders` | 无订单时 Bot 进入 IDLE |
| 机器人生命周期 | `TestBotWakesOnNewOrder` | 空闲 Bot 在新订单到达时立即取单 |
| 移除机器人 | `TestRemoveBotIdle` | 移除空闲 Bot |
| 移除机器人 | `TestRemoveBotProcessingReturnsOrder` | 移除工作中的 Bot，订单回归 pending |
| 移除机器人 | `TestRemoveBotReturnsOrderOriginalPosition` | 多 Bot 销毁后订单按 ID 回归原始位置 |
| 移除机器人 | `TestRemoveBotReturnsOrderMaintainsVIPPriority` | 回归订单保持 VIP/Normal 队列分离 |
| 多机器人 | `TestMultipleBotsConcurrent` | 多 Bot 并发处理、全部完成 |
| 输出格式 | `TestOutputContainsTimestamp` | 输出包含时间戳格式 |
| 输出格式 | `TestOutputContainsRequiredKeywords` | 输出包含必要关键字 |
| 边界情况 | `TestRemoveBotWhenNoBots` | 无 Bot 时 RemoveNewestBot 不 panic |
| 边界情况 | `TestRemoveNewestBotOnly` | 只移除最新 Bot，早期 Bot 不受影响 |

测试依赖注入方式：`NewOrderController(w, processingTime)` 接受可配置的处理时间，测试中设为 100ms。

## 11. 脚本设计

### build.sh

```bash
#!/bin/bash
set -e
echo "Building CLI application..."
go build -o order-controller .
echo "Build completed"
```

### test.sh

```bash
#!/bin/bash
set -e
echo "Running unit tests..."
go test -v -count=1 ../...
echo "Unit tests completed"

echo ""
echo "Running race detection tests..."
go test -v -count=1 -race ../...
echo "Race detection tests completed"
```

### run.sh

```bash
#!/bin/bash
set -e
echo "Running CLI application..."
./order-controller > scripts/result.txt
echo "CLI application execution completed"
```

## 12. 并发安全

- 所有对 `OrderController` 状态的读写通过 `sync.Mutex` 保护
- 每个 Bot 在独立 goroutine 中运行 `run()` 主循环
- Bot 通过 `orderCh`（缓冲 1）接收派单，通过 `stopCh`（close）接收停止信号
- `RemoveNewestBot` 通过 `close(stopCh)` 通知 Bot 退出，Bot 协程自行清理（订单回归 / 从列表移除），避免外部操作内部状态导致竞态
- `idleBots` 作为 FIFO 队列，最早空闲的 Bot 优先被派单
- 测试运行 `go test -race` 确保无数据竞争

## 13. 错误处理

- Bot 被销毁时，通过 `close(stopCh)` 优雅中断处理
- 记录所有状态变更日志
- `RemoveNewestBot` 在无 Bot 时安全返回，不 panic
- 无需要恢复的致命错误（纯内存操作）

## 14. 实现文件清单

| 文件 | 职责 |
|------|------|
| `main.go` | 入口 + 模拟场景编排 |
| `controller.go` | 核心控制器、Order/Bot 定义、所有业务逻辑 |
| `controller_test.go` | 19 个单元测试 |
| `go.mod` | 模块定义 |
| `scripts/build.sh` | 编译脚本 |
| `scripts/test.sh` | 测试脚本（含数据竞争检测） |
| `scripts/run.sh` | 运行脚本 |

## 15. 关键设计决策总结

1. **平铺结构**：所有 Go 文件在 `package main`，无需子包，降低认知负担
2. **双队列分离设计**：`vipPending` 和 `normalPending` 独立 FIFO 队列，取单时先 VIP 后 NORMAL，逻辑清晰无歧义
3. **goroutine + channel 实现 Bot 并发处理**：每个 Bot 一个 goroutine，`orderCh` 派单 + `stopCh` 优雅中断
4. **idleBots FIFO 队列 + channel 派单**：新订单到达时从 `idleBots` 首部取 Bot 通过 `orderCh` 派单，比忙轮询高效，比 `sync.Cond` 更简洁
5. **时间戳基于服务器当前时间**：`time.Now().Format("15:04:05")`，与服务器时钟一致
6. **可测试性**：`processingTime` 参数化，测试中用短时间替换 10s
7. **Bot 自行清理**：`RemoveNewestBot` 只 `close(stopCh)`，Bot 协程回调 Controller 完成清理，避免外部操作内部状态
