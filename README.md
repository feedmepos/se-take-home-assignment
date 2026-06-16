# obot — McDonald's Order Controller

## 项目概述

CLI 应用，模拟麦当劳自动烹饪机器人订单控制系统。支持 VIP / Normal 两级订单优先级、Bot 动态增减、订单生命周期管理。

## 技术方案

### 模块说明

| 模块 | 路径 | 职责 |
|------|------|------|
| `order` | `internal/order/` | 订单实体，工厂方法 `NewVIP()` / `NewNormal()`，`atomic` 自增 ID |
| `queue` | `internal/mgr/queue/` | 订单队列接口及实现，状态转移（pending / processing / completed） |
| `bot` | `internal/mgr/bot/` | Bot 状态机及生命周期管理，依赖 `queue` 接口 |
| `orchestrator` | `orchestrator/` | CLI REPL 事件循环，命令分发，Bot 异步事件日志 |

### 模块依赖

```
main
 └── orchestrator
       ├── internal/mgr/queue (interface + impl)
       ├── internal/mgr/bot
       │     └── internal/mgr/queue (interface only)
       └── internal/order
```

依赖方向单向向下，`bot` 依赖 `queue` 接口而非实现，新增优先级只需 `order` 包加 factory 函数。

### Queue 设计

三容器 + `sync.Cond` 并发模型：

```
Enqueue → pending (min-heap)    按 (Priority↑, ID↑) 排序
            ↓ Dequeue
         processing (slice)      Bot 处理中
            ↓ CompleteOrder  ↘ ReturnToPending
         completed (slice)     pending (heap.Push)
```

`Signal` / `Broadcast` 内聚于 `queue` 包，`Dequeue(stopCh)` 通过内部 helper goroutine 将外部 `stopCh` 转为 `cond.Broadcast` 唤醒。

### Bot 状态机

```
IDLE ──Dequeue 取到订单──→ PROCESSING ──10s 完成──→ IDLE
  │                           │
  └──stopCh──→ STOPPED ←──stopCh──┘
```

`Bot.Run()` 以 `sync.RWMutex` 保护 `State` / `CurrentOrder`，`Manager` 负责批量生命周期管理。

### 项目结构

```
./
├── main.go                          # 入口
├── orchestrator/
│   └── biz.go                       # CLI REPL 循环、事件日志
├── internal/
│   ├── mgr/
│   │   ├── queue/
│   │   │   ├── interface.go         # OrderQueue 接口
│   │   │   ├── biz.go               # min-heap + sync.Cond 实现
│   │   │   └── biz_test.go          # 27 个单元测试
│   │   └── bot/
│   │       ├── biz.go               # Bot 状态机 + Manager
│   │       └── biz_test.go          # 16 个单元测试（mock queue）
│   └── order/
│       └── biz.go                   # Order + NewVIP/NewNormal (atomic ID)
├── scripts/
│   ├── build.sh                     # go build
│   ├── test.sh                      # go vet + go test
│   └── run.sh                       # heredoc 驱动 CLI → result.txt
├── docs/
│   └── prd.md                       # 需求文档
└── go.mod
```

## 测试

```bash
# 全部单元测试
bash scripts/test.sh

# 按包运行
go test ./internal/mgr/queue/ -v   # 27 tests: 入队/出队/回收/完成/并发
go test ./internal/mgr/bot/ -v     # 16 tests: Bot 状态机/生命周期 (mock queue)
```

| 包 | 用例数 | 覆盖 |
|----|--------|------|
| `queue` | 27 | Enqueue/Dequeue/RecycleOrder/CompleteOrder/PendingOrders/ProcessingOrders/CompletedOrders + 并发 |
| `bot` | 16 | AddBot/RemoveBot/Bot.Run/Bots/Shutdown/State（mock queue 隔离） |

## 运行

### 交互模式

```bash
go build -o obot .
./obot

> n       # 新建 Normal 订单
> v       # 新建 VIP 订单
> +       # 增加 Bot
> -       # 减少 Bot
> s       # 查看状态
> w       # 等待 5 秒（含异步事件输出）
> q       # 退出
```

### CI 模式（管道脚本）

```bash
bash scripts/run.sh
cat scripts/result.txt
```

`run.sh` 通过 heredoc 向 CLI 发送预设命令序列，stdout 重定向到 `scripts/result.txt`，包含 `HH:MM:SS` 时间戳的完整订单生命周期日志。

### 输出示例

```
11:15:23 [SYSTEM] McDonald's Order Controller started
11:15:23 [ORDER] Normal #1 created
11:15:23 [ORDER] VIP #2 created
11:15:23 [STATE] Pending: [VIP #2, Normal #1] | Processing: [] | Completed: []
11:15:23 [BOT] Bot #1 added
11:15:23 [ORDER] VIP #2 PROCESSING by Bot #1
11:15:33 [ORDER] VIP #2 COMPLETED
11:15:33 [ORDER] Normal #1 PROCESSING by Bot #1
11:15:43 [ORDER] Normal #1 COMPLETED
11:15:43 [BOTS] Bot #1 IDLE
```
