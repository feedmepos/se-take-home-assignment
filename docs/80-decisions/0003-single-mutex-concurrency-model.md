# ADR-0003: 单互斥锁状态机，而非 channel/actor

## Status

Accepted

## Context

bot 并发处理订单需要一个并发模型。Go 惯用法有两类候选：channel/actor（每 bot 一个
goroutine 收发消息）或共享状态加锁。系统全部状态（pending 队列、completed、bots、计数器）
高度耦合，每个命令都要原子地读写其中多项。

## Decision

单一 `sync.Mutex` 保护全部 Controller 状态。每个处理中订单只起一个定时 goroutine
（`select` 等 `time.After` 或 `ctx.Done()`），其完成路径 `complete(bot, o)` 同样持锁进入
状态机，并以 `bot.order != o` 守卫识别"已被销毁退回"的过期完成。

## Consequences

- 所有状态迁移串行化，日志顺序即事件顺序；竞态面收敛到 `complete` 一个守卫点。
- 单测可直接持锁断言内部状态，配合大时长注入实现确定性测试。
- 锁粒度粗，但命令频率为人工/脚本级，无吞吐压力，不构成瓶颈。

## Alternatives Considered

- 每 bot 一个长驻 goroutine + channel 派单：bot 增删、订单退回、drain 探测都变成跨
  goroutine 协议，状态分散难断言，对本规模是负收益。

## Related Documents

- [30-design/concurrency.md](../30-design/concurrency.md)
- [30-design/order-flow.md](../30-design/order-flow.md)
