# 时间与加速

- 处理时长由 flag `-process`（duration）/ 环境变量 `PROCESS_SECONDS` 注入，默认 **10s**；
  flag 优先于环境变量。
- 日志时间戳始终为真实墙钟 `HH:MM:SS`（`time.Now().Format("15:04:05")`），满足 CI 正则
  `[0-9]{2}:[0-9]{2}:[0-9]{2}`。取舍见
  [ADR-0002](../80-decisions/0002-wall-clock-timestamps-with-acceleration.md)。
- 单测把 `procDur` 设为很大（如 1h），使 bot 停在 PROCESSING 不触发完成，从而**无 sleep、
  确定性**验证分配/退回逻辑（见 [testing.md](testing.md)）。
- `run.sh` 默认真实 10s 产出真实演示输出；可 `PROCESS_SECONDS=1 ./scripts/run.sh` 加速。
