# 80-decisions — 架构决策记录（ADR）

| 编号 | 决策 | 状态 |
|------|------|------|
| [0001](0001-vip-requeue-position.md) | 退回 VIP 单排在当前 VIP 队尾，不还原"原位置" | Accepted |
| [0002](0002-wall-clock-timestamps-with-acceleration.md) | 真实墙钟时间戳 + 注入式时长加速 | Accepted |
| [0003](0003-single-mutex-concurrency-model.md) | 单互斥锁状态机，而非 channel/actor | Accepted |
