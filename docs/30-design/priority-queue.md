# 优先级队列（queue.go）

队列恒为 `[VIP..., Normal...]` 有序。

- **Enqueue(Normal)**：追加到末尾。
- **Enqueue(VIP)**：插入到"最后一个 VIP 之后、第一个 Normal 之前"（即下标 = 当前 VIP 数量）
  → VIP 排在所有现有 VIP 之后、所有 Normal 之前。
- **Dequeue()**：弹出队首（最高优先级）；空队列返回 nil。

纯数据结构：无锁、无时间、无日志，同步责任在调用方（Controller）。
退回单的入队位置取舍见 [ADR-0001](../80-decisions/0001-vip-requeue-position.md)。
