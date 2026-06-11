# 测试策略与覆盖

策略：注入极大 `procDur`（1h）让 bot 停在 PROCESSING，状态迁移全部由命令同步触发，
测试**无 sleep、确定性**；`test.sh` 始终开 `-race`。

## queue_test.go（纯逻辑，确定性）

- VIP/Normal 混合入队后顺序正确（VIP 全部在 Normal 前，组内 FIFO）。
- 连续 VIP 入队组内保持 FIFO。
- 空队列 Dequeue 返回 nil。
- Len 统计正确。
- 混合入队后 Dequeue 按优先级顺序清空。

## controller_test.go（注入大 procDur，无 sleep）

- 订单 ID 唯一且递增。
- `+bot` 优先领取 VIP 订单（混合下单后断言 bot.order 为 VIP）。
- `-bot` 处理中销毁 → 订单退回 pending 且维持优先级；bots 减少。
- `-bot` 处理中销毁且存在 IDLE bot → 退回单立即被 IDLE bot 领取，不滞留。
- `-bot` IDLE 销毁 → 仅移除 bot，不影响订单。
- 无 bot 时 `-bot` → 空操作不 panic。
- 无 pending 时 `+bot` 后 bot 处于 IDLE。
- 小 procDur（10ms）轮询 `Drained()` → 订单按 VIP 优先完成、bot 自动接续下一单
  （唯一带真实时间的测试，2s 超时保护）。

## 集成验证

`run.sh` 端到端跑演示脚本，人工核对 result.txt 行为与时间戳；CI 每次 PR 真实 10s 重跑，
见 [50-deployment/ci-verification.md](../50-deployment/ci-verification.md)。
