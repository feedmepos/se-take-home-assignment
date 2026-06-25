# McDonald 订单管理系统 - 架构设计

**文档编号**: 02
**版本**: 1.0
**创建日期**: 2026-06-25
**作者**: Software Architect

---

## 一、项目结构

### 1.1 Go 项目目录结构

```
McDonald/
├── cmd/
│   └── cli/
│       └── main.go              # CLI 应用入口
├── internal/
│   ├── model/
│   │   ├── order.go            # Order 实体定义
│   │   └── bot.go              # Bot 实体定义
│   ├── queue/
│   │   └── priority_queue.go   # 优先级队列实现
│   ├── system/
│   │   └── state.go            # SystemState 状态管理
│   └── output/
│       └── writer.go           # 输出到终端和 result.txt
├── script/
│   ├── build.sh                # 编译脚本
│   ├── run.sh                  # 运行脚本
│   └── test.sh                 # 测试脚本
├── docs/
│   └── 02-architecture.md      # 本文档
├── go.mod
├── go.sum
└── result.txt                  # 输出结果文件
```

### 1.2 模块职责

| 模块 | 职责 | 依赖关系 |
|------|------|----------|
| `model` | 定义数据结构和枚举类型 | 无 |
| `queue` | 优先级队列的入队、出队、重排序 | model |
| `system` | 管理订单队列和机器人状态 | model, queue, output |
| `output` | 格式化输出到终端和文件 | 无 |
| `cmd/cli` | 解析 CLI 命令并调用 system | system |

---

## 二、数据结构设计

### 2.1 Order（订单）

```go
// internal/model/order.go
package model

// OrderType 订单类型
type OrderType int

const (
    OrderTypeNormal OrderType = iota
    OrderTypeVIP
)

// OrderStatus 订单状态
type OrderStatus int

const (
    OrderStatusPending  OrderStatus = iota  // 待处理
    OrderStatusProcessing                   // 处理中
    OrderStatusComplete                      // 已完成
)

// Order 订单实体
type Order struct {
    ID        int         // 唯一递增 ID
    Type      OrderType   // 订单类型
    Status    OrderStatus // 订单状态
    CreatedAt time.Time   // 创建时间
    StartTime *time.Time  // 开始处理时间（可选）
    EndTime   *time.Time  // 完成时间（可选）
}
```

**设计说明**：
- `ID` 使用全局递增整数，确保唯一性
- `StartTime` 为 nil 表示未开始处理
- `EndTime` 为 nil 表示未完成

### 2.2 Bot（烹饪机器人）

```go
// internal/model/bot.go
package model

// BotStatus 机器人状态
type BotStatus int

const (
    BotStatusIdle      BotStatus = iota  // 空闲
    BotStatusProcessing                    // 处理订单中
    BotStatusStopping                      // 正在被停止
)

// Bot 烹饪机器人
type Bot struct {
    ID         int         // 机器人唯一 ID
    Status     BotStatus   // 当前状态
    Current    *Order      // 当前处理的订单（nil 表示空闲）
    Timer      *time.Timer // 10 秒定时器
    StopChan   chan struct{} // 停止信号通道
}
```

**设计说明**：
- `Timer` 用于实现 10 秒处理时间
- `StopChan` 用于接收停止信号，支持优雅中断

### 2.3 SystemState（系统状态）

```go
// internal/system/state.go
package system

import (
    "sync"
    "McDonald/internal/model"
)

type SystemState struct {
    mu         sync.Mutex           // 保护并发访问
    orderID    int                  // 下一个可用订单 ID
    botID      int                  // 下一个可用机器人 ID
    pending    []*model.Order       // 待处理队列
    processing []*model.Order       // 处理中订单（已不再使用，保留用于调试）
    complete   []*model.Order       // 已完成订单
    bots       map[int]*model.Bot   // 所有机器人
}
```

**并发安全**：
- 使用 `sync.Mutex` 保护所有共享状态
- 读取/写入状态前必须获取锁

---

## 三、CLI 命令设计

### 3.1 命令列表

| 命令 | 格式 | 说明 |
|------|------|------|
| `normal` | `normal` | 创建普通订单 |
| `vip` | `vip` | 创建 VIP 订单 |
| `add-bot` | `add-bot` | 添加新机器人 |
| `remove-bot` | `remove-bot` | 移除最新机器人 |
| `status` | `status` | 查看系统状态 |
| `exit` | `exit` | 退出程序 |

### 3.2 命令处理器

```go
// cmd/cli/main.go
package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
    "McDonald/internal/system"
)

func main() {
    state := system.NewSystemState()
    scanner := bufio.NewScanner(os.Stdin)
    
    fmt.Println("=== McDonald Order Management System ===")
    fmt.Println("Commands: normal, vip, add-bot, remove-bot, status, exit")
    
    for {
        fmt.Print("> ")
        if !scanner.Scan() {
            break
        }
        
        cmd := strings.TrimSpace(scanner.Text())
        switch cmd {
        case "normal":
            state.CreateOrder(model.OrderTypeNormal)
        case "vip":
            state.CreateOrder(model.OrderTypeVIP)
        case "add-bot":
            state.AddBot()
        case "remove-bot":
            state.RemoveBot()
        case "status":
            state.PrintStatus()
        case "exit":
            fmt.Println("Goodbye!")
            return
        default:
            fmt.Println("Unknown command:", cmd)
        }
    }
}
```

---

## 四、机器人状态机

### 4.1 状态转换图

```
                    ┌─────────────┐
                    │   IDLE      │
                    │  (空闲)     │
                    └──────┬──────┘
                           │
              有待处理订单   │ startProcessing()
                           ▼
                    ┌─────────────┐
                    │ PROCESSING  │◄──────┐
                    │  (处理中)   │       │
                    └──────┬──────┘       │ 10秒超时
                           │              │
              stopBot()    │              │ Timer
                           ▼              │
                    ┌─────────────┐       │
                    │  STOPPING   │───────┘
                    │  (停止中)   │
                    └─────────────┘
```

### 4.2 状态详细说明

| 状态 | 进入条件 | 退出条件 | 行为 |
|------|----------|----------|------|
| IDLE | 初始化、订单处理完成、启动但无订单 | 有待处理订单 | 等待订单 |
| PROCESSING | 获得订单、startProcessing() | 10秒超时、stopBot() | 处理订单 |
| STOPPING | remove-bot 调用 | 处理中断完成 | 返回订单到队列 |

### 4.3 状态机实现

```go
// internal/system/state.go
package system

import (
    "time"
    "McDonald/internal/model"
)

const ProcessingDuration = 10 * time.Second

func (b *Bot) startProcessing(order *model.Order, state *SystemState) {
    b.Status = model.BotStatusProcessing
    b.Current = order
    order.Status = model.OrderStatusProcessing
    now := time.Now()
    order.StartTime = &now
    
    b.Timer = time.AfterFunc(ProcessingDuration, func() {
        state.mu.Lock()
        defer state.mu.Unlock()
        
        if b.Status == model.BotStatusProcessing {
            b.completeOrder(order, state)
        }
    })
}

func (b *Bot) completeOrder(order *model.Order, state *SystemState) {
    now := time.Now()
    order.EndTime = &now
    order.Status = model.OrderStatusComplete
    
    // 从 pending 中移除
    state.removeFromPending(order)
    
    // 添加到 complete
    state.complete = append(state.complete, order)
    
    // 机器人回到空闲
    b.Status = model.BotStatusIdle
    b.Current = nil
    
    // 输出完成信息
    output.Complete(order)
    
    // 尝试处理下一个订单
    state.assignNextOrder(b)
}

func (b *Bot) stopProcessing(state *SystemState) {
    if b.Status != model.BotStatusProcessing {
        return
    }
    
    b.Status = model.BotStatusStopping
    b.Timer.Stop()
    
    if b.Current != nil {
        order := b.Current
        order.Status = model.OrderStatusPending
        order.StartTime = nil
        
        // 机器人放弃此订单，重新分配
        state.assignNextOrder(b)
    }
}
```

---

## 五、优先级队列算法

### 5.1 入队算法

VIP 订单排在所有普通订单之前，但排在现有 VIP 订单之后。

```go
// internal/queue/priority_queue.go
func (q *PriorityQueue) Enqueue(order *model.Order) {
    if order.Type == model.OrderTypeVIP {
        // 找到最后一个 VIP 订单的位置
        insertIdx := len(q.orders) // 默认插入末尾
        for i, o := range q.orders {
            if o.Type == model.OrderTypeNormal {
                insertIdx = i
                break
            }
        }
        // 在 insertIdx 位置插入
        q.orders = append(q.orders[:insertIdx], append([]*model.Order{order}, q.orders[insertIdx:]...)...)
    } else {
        // 普通订单直接追加到末尾
        q.orders = append(q.orders, order)
    }
}
```

**复杂度**：O(n) - 需要遍历找到第一个普通订单位置

### 5.2 出队算法

始终返回队列头部订单。

```go
func (q *PriorityQueue) Dequeue() *model.Order {
    if len(q.orders) == 0 {
        return nil
    }
    order := q.orders[0]
    q.orders = q.orders[1:]
    return order
}
```

**复杂度**：O(1)

### 5.3 返回队列算法（remove-bot 场景）

当机器人被移除时，正在处理的订单需要返回队列并保持优先级。

```go
func (state *SystemState) returnToPending(order *model.Order) {
    order.Status = model.OrderStatusPending
    
    if order.Type == model.OrderTypeVIP {
        // VIP 订单：找到第一个普通订单前插入
        insertIdx := len(state.pending)
        for i, o := range state.pending {
            if o.Type == model.OrderTypeNormal {
                insertIdx = i
                break
            }
        }
        state.pending = append(state.pending[:insertIdx], 
            append([]*model.Order{order}, state.pending[insertIdx:]...)...)
    } else {
        // 普通订单：追加到末尾
        state.pending = append(state.pending, order)
    }
}
```

---

## 六、输出设计

### 6.1 Writer 接口

```go
// internal/output/writer.go
package output

import (
    "fmt"
    "os"
    "time"
    "McDonald/internal/model"
)

type Writer struct {
    file *os.File
}

func NewWriter(filename string) (*Writer, error) {
    file, err := os.Create(filename)
    if err != nil {
        return nil, err
    }
    return &Writer{file: file}, nil
}

func (w *Writer) Close() error {
    return w.file.Close()
}

func (w *Writer) log(format string, args ...interface{}) {
    timestamp := time.Now().Format("15:04:05")
    msg := fmt.Sprintf(format, args...)
    line := fmt.Sprintf("%s - %s", timestamp, msg)
    
    fmt.Println(line)
    fmt.Fprintln(w.file, line)
}
```

### 6.2 输出格式示例

```
14:30:45 - Order #1 created (VIP) - PENDING
14:30:47 - Order #2 created (Normal) - PENDING
14:30:50 - Bot #1 created and processing Order #1 (VIP)
14:31:00 - Order #1 (VIP) COMPLETE by Bot #1
14:31:00 - Bot #1 idle, assigned Order #2 (Normal)
14:31:10 - Order #2 (Normal) COMPLETE by Bot #1
14:31:15 - Bot #2 created and idle
14:31:20 - Bot #2 removed, returned to IDLE
```

---

## 七、并发模型

### 7.1 Goroutine 使用策略

| 用途 | Goroutine 数量 | 生命周期 |
|------|----------------|----------|
| main | 1 | 应用全程 |
| 每个 Bot | 1 | Bot 创建到销毁 |

### 7.2 同步机制

```
┌─────────────────────────────────────────────────┐
│                 SystemState                      │
│  ┌─────────────────────────────────────────┐   │
│  │              sync.Mutex                  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  protected:                                     │
│    - orderID, botID (int)                       │
│    - pending, complete ([]*Order)              │
│    - bots (map[int]*Bot)                       │
└─────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │  main   │    │  Bot #1 │    │  Bot #2 │
    │ goroutine│    │ goroutine│    │ goroutine│
    └────┬────┘    └────┬────┘    └────┬────┘
         │               │               │
         └───────────────┴───────────────┘
                      │
                 Lock/Unlock
```

### 7.3 关键竞争点

| 操作 | 锁粒度 | 说明 |
|------|--------|------|
| CreateOrder | 函数级 | 简短操作，快速获取释放 |
| AddBot | 函数级 | 创建 goroutine |
| RemoveBot | 函数级 | 需要停止 goroutine |
| assignNextOrder | 函数级 | 需要遍历 bots map |
| completeOrder | 函数级 | 更新订单状态 |
| PrintStatus | 函数级 | 只读操作，但需要一致性快照 |

---

## 八、技术决策记录 (ADR)

### ADR-001: 使用 Go 而非 Node.js

**状态**: 已接受

**背景**: 需要选择后端实现语言

**决策**: 使用 Go (Golang)

**理由**:
1. 编译成单个二进制，GitHub Actions 运行简单
2. 原生支持并发 (goroutine + channel)
3. 性能优秀，资源占用低
4. 静态类型减少运行时错误

**后果**:
- 开发人员需要熟悉 Go 语法
- 相比 Node.js 调试工具链稍弱

---

### ADR-002: 使用 Mutex 而非 Channel 进行状态管理

**状态**: 已接受

**背景**: 需要选择并发安全的状态管理方式

**决策**: 使用 `sync.Mutex` 保护共享状态

**理由**:
1. 订单管理是典型的读-修改-写场景
2. 机器人 goroutine 需要共享状态
3. Mutex 语义直观，易于理解和维护
4. 避免 channel 复杂的消息传递开销

**替代方案**:
- Channel: 适合纯粹的消息传递，不适合共享状态
- sync.RWMutex: 如果读多写少可以考虑

---

### ADR-003: 使用 time.AfterFunc 实现延迟

**状态**: 已接受

**背景**: 需要实现 10 秒订单处理时间

**决策**: 使用 `time.AfterFunc`

**理由**:
1. 非阻塞，不占用 goroutine
2. 支持 `Stop()` 方法实现优雅中断
3. 简单直接

**替代方案**:
- `time.Ticker`: 适合周期性任务
- `select` + `time.After`: 需要单独的 goroutine

---

### ADR-004: In-Memory 存储

**状态**: 已接受

**背景**: 需求明确无需持久化

**决策**: 所有数据存储在内存中

**理由**:
1. 需求明确说明 "No data persistence is needed"
2. 简化实现，无需数据库
3. 性能最优

**后果**:
- 应用重启后数据丢失
- 无法跨会话查看历史订单

---

## 九、测试策略

### 9.1 单元测试覆盖

| 模块 | 测试用例 |
|------|----------|
| `model` | Order 创建、状态转换 |
| `queue` | Enqueue、Dequeue 优先级验证 |
| `system` | CreateOrder、AddBot、RemoveBot |
| `output` | 时间戳格式验证 |

### 9.2 集成测试场景

1. **VIP 优先**: 创建多个订单，验证 VIP 在普通订单前
2. **Bot 工作流**: AddBot → 处理 → Complete
3. **Remove 恢复**: RemoveBot 验证订单返回队列
4. **并发安全**: 多 goroutine 操作状态

---

## 十、文件清单

| 文件路径 | 说明 |
|----------|------|
| `cmd/cli/main.go` | CLI 入口点 |
| `internal/model/order.go` | Order 实体 |
| `internal/model/bot.go` | Bot 实体 |
| `internal/queue/priority_queue.go` | 优先级队列 |
| `internal/system/state.go` | 系统状态管理 |
| `internal/output/writer.go` | 输出 Writer |
| `script/build.sh` | 编译脚本 |
| `script/run.sh` | 运行脚本 |
| `script/test.sh` | 测试脚本 |

---

*文档版本: 1.0*
*最后更新: 2026-06-25*
