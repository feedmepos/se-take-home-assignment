# McDonald 订单管理系统 - 实现文档

**文档编号**: 03
**版本**: 1.0
**创建日期**: 2026-06-25
**作者**: Developer

---

## 一、项目结构

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
│   │   ├── priority_queue.go   # 优先级队列实现
│   │   └── priority_queue_test.go
│   ├── system/
│   │   ├── state.go            # SystemState 状态管理
│   │   └── state_test.go
│   └── output/
│       └── writer.go           # 输出到终端和 result.txt
├── script/
│   ├── build.sh                # 编译脚本
│   ├── run.sh                  # 运行脚本
│   └── test.sh                 # 测试脚本
├── docs/
├── go.mod
├── go.sum
└── result.txt                  # 输出结果文件
```

---

## 二、核心模块

### 2.1 model 包

#### order.go
定义了订单的数据结构：

```go
type Order struct {
    ID        int         // 唯一递增 ID
    Type      OrderType   // 订单类型 (Normal/VIP)
    Status    OrderStatus // 订单状态 (Pending/Processing/Complete)
    CreatedAt time.Time  // 创建时间
    StartTime *time.Time // 开始处理时间
    EndTime   *time.Time // 完成时间
}
```

#### bot.go
定义了机器人的数据结构：

```go
type Bot struct {
    ID       int         // 机器人 ID
    Status   BotStatus   // 状态 (Idle/Processing/Stopping)
    Current  *Order      // 当前处理的订单
    Timer    *time.Timer // 10秒定时器
    StopChan chan struct{} // 停止信号通道
}
```

### 2.2 queue 包

优先级队列实现，核心逻辑：

1. **入队规则**：
   - VIP 订单插入到所有普通订单之前
   - 多个 VIP 订单按 FIFO 排列
   - 普通订单追加到队列末尾

2. **出队规则**：
   - 始终返回队首订单（优先级最高）

3. **关键方法**：
   - `Enqueue(order)` - 按优先级入队
   - `Dequeue()` - 取出队首
   - `InsertAtEnd(order)` - 普通订单追加到末尾（用于 remove-bot 场景）

### 2.3 system 包

SystemState 是核心状态管理器：

```go
type SystemState struct {
    mu       sync.Mutex
    orderID  int
    botID    int
    pending  *queue.PriorityQueue
    complete []*model.Order
    bots     map[int]*model.Bot
    writer   *output.Writer
}
```

**核心方法**：

| 方法 | 功能 |
|------|------|
| `CreateOrder(type)` | 创建订单并入队 |
| `AddBot()` | 添加机器人并尝试分配订单 |
| `RemoveBot()` | 移除最新机器人 |
| `assignOrderToBot(bot)` | 分配待处理订单给机器人 |
| `completeOrder(bot, order)` | 标记订单完成 |
| `PrintStatus()` | 打印系统状态 |

### 2.4 output 包

Writer 负责输出到控制台和文件：

```go
func (w *Writer) log(format string, args ...interface{}) {
    timestamp := time.Now().Format("15:04:05")
    msg := fmt.Sprintf(format, args...)
    line := fmt.Sprintf("%s - %s", timestamp, msg)

    fmt.Println(line)
    fmt.Fprintln(w.file, line)
}
```

所有输出包含 `HH:MM:SS` 格式时间戳。

---

## 三、CLI 命令

| 命令 | 别名 | 功能 |
|------|------|------|
| `normal` | - | 创建普通订单 |
| `vip` | - | 创建 VIP 订单 |
| `add-bot` | `addbot`, `+bot`, `+` | 添加新机器人 |
| `remove-bot` | `removebot`, `-bot`, `-` | 移除最新机器人 |
| `status` | `stat`, `s` | 显示系统状态 |
| `exit` | `quit`, `q` | 退出程序 |

---

## 四、运行示例

```
$ echo -e "normal\nvip\nnormal\nadd-bot\nstatus\nexit" | ./bin/mcdonald

=== McDonald Order Management System ===
Commands: normal, vip, add-bot, remove-bot, status, exit

18:48:34 - Order #1 created (Normal) - PENDING
18:48:34 - Order #2 created (VIP) - PENDING
18:48:34 - Order #3 created (Normal) - PENDING
18:48:34 - Bot #1 created and idle
18:48:34 - Bot #1 processing Order #2 (VIP)
18:48:34 - === Status ===
18:48:34 - PENDING (2):
18:48:34 -   #1 Normal PENDING
18:48:34 -   #3 Normal PENDING
18:48:34 - PROCESSING (1):
18:48:34 -   Bot #1: Order #2 (VIP)
18:48:34 - COMPLETE (0):
18:48:34 - BOTS (1):
18:48:34 -   Bot #1: PROCESSING - Order #2 (VIP)
18:48:34 - =============
Goodbye!
```

---

## 五、并发安全

使用 `sync.Mutex` 保护所有共享状态：

```go
func (s *SystemState) CreateOrder(orderType model.OrderType) {
    s.mu.Lock()
    defer s.mu.Unlock()
    // ... 操作
}
```

goroutine 间的协调通过 Timer 的回调实现，确保状态更新在锁内完成。

---

## 六、测试覆盖率

| 包 | 测试文件 | 测试用例 |
|----|----------|----------|
| `internal/queue` | priority_queue_test.go | 7 个 |
| `internal/system` | state_test.go | 7 个 |

**运行测试**：
```bash
./script/test.sh
```

**测试结果**：所有 14 个测试用例通过。

---

## 七、构建和运行

### 构建
```bash
./script/build.sh
```

### 运行
```bash
# 交互模式
./bin/mcdonald

# 管道输入
echo "normal\nvip\nadd-bot\nexit" | ./bin/mcdonald

# 使用脚本
./script/run.sh "normal\nvip"
```

### 测试
```bash
./script/test.sh
```

---

## 八、输出文件

- `result.txt`: 包含所有操作的时间戳日志
- 格式：`HH:MM:SS - 消息内容`

---

*文档版本: 1.0*
*最后更新: 2026-06-25*
