# 并发模型与边界情况

并发模型：单一 `sync.Mutex` 保护全部 Controller 状态，每个处理中订单一个定时 goroutine，
完成路径（`complete`）同样持锁进入状态机。选型理由见
[ADR-0003](../80-decisions/0003-single-mutex-concurrency-model.md)。

| 情况 | 处理 |
|------|------|
| 销毁瞬间 bot 恰好完成（time.After 与 ctx.Done 竞态） | `complete(bot, o)` 持锁后检查 `bot.order != o`，已被销毁则直接返回，避免订单被同时"完成"和"退回"导致双处理 |
| 退回单滞留：销毁时其他 bot 恰好 IDLE | `RemoveBot` 重新入队后立即尝试派给 IDLE bot，否则没有任何事件会再触发分配，`drain` 死等 |
| 无 bot 时下单 | 订单留在 pending，等 `+bot` 领取 |
| 无 pending 时 `+bot` | bot 进入 IDLE，待新单到来时由下单流程派发 |
| 无 bot 时 `-bot` | 空操作（提示无 bot 可销毁） |
| 处理中订单退回后的"原位置" | 按优先级规则重新入队：VIP 退回时排在当前 VIP 队尾。已知简化，见 [ADR-0001](../80-decisions/0001-vip-requeue-position.md) |
| EOF / 未 quit 退出 | 直接退出，后台未完成订单丢弃（内存态，符合无持久化） |
| 非法命令 / 缺参数（如 `wait` 无数字） | 打印提示，不崩溃，继续读下一条 |
| 加速模式下 `wait` 与 procDur 不匹配 | `drain` 兜底，保证逻辑正确（仅时序观感差异） |
