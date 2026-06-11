# 领域模型

```go
type OrderType int   // Normal=0, VIP=1
type Order struct { ID int; Type OrderType }   // ID 全局唯一、递增
type Bot   struct { id int; order *Order; cancel context.CancelFunc }
```

`Bot.order == nil` 即 IDLE；非 nil 即 PROCESSING 该订单，`cancel` 用于销毁时中止处理 goroutine。

## Controller 状态

均由单一 `sync.Mutex` 保护（并发模型见 [concurrency.md](concurrency.md)、
[ADR-0003](../80-decisions/0003-single-mutex-concurrency-model.md)）：

- `pending  *PriorityQueue` — 待处理区
- `completed []*Order` — 完成区
- `bots     []*Bot` — 活跃机器人，slice 末尾为"最新"
- `nextOrderID, nextBotID int` — 递增计数器
- `procDur time.Duration` — 单订单处理时长（默认 10s，可注入加速）
- `out io.Writer` — 日志输出目标（stdout，CI 由 run.sh 重定向到 result.txt）
