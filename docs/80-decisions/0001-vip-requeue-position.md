# ADR-0001: 退回 VIP 单排在当前 VIP 队尾，不还原"原位置"

## Status

Accepted

## Context

`-bot` 销毁正在处理订单的 bot 时，订单需退回 PENDING。若退回的是 VIP 单，且它被处理期间
有新 VIP 单入队，"严格还原原位置"要求记录并比较入队序号，把退回单插到这些新单之前。

## Decision

退回单直接走普通 `Enqueue`：VIP 退回时排在**当前 VIP 队尾**（仍在所有 Normal 之前），
不还原其历史位置。

## Consequences

- 队列只需维护一个不变式 `[VIP..., Normal...]`，无需订单携带入队序号。
- 极端时序下退回的 VIP 单会排在"它被处理期间新到的 VIP 单"之后——1 小时原型范围内可接受，
  行为已在 [30-design/concurrency.md](../30-design/concurrency.md) 边界表中明示。

## Alternatives Considered

- 订单携带单调入队序号，退回时按序号插入：实现正确"原位置"，但为罕见时序增加全队列比较
  逻辑与测试面，收益不成比例。

## Related Documents

- [30-design/priority-queue.md](../30-design/priority-queue.md)
- [30-design/order-flow.md](../30-design/order-flow.md)
