# ADR-0002: 真实墙钟时间戳 + 注入式时长加速

## Status

Accepted

## Context

CI（backend-verify-result）要求 `result.txt` 含 `HH:MM:SS` 时间戳；需求要求单订单处理
10s；本地开发与单测又需要快速反馈。三者对"时间"的诉求冲突：mock 时钟可加速但产出假
时间戳，纯真实时钟则单测必然 sleep。

## Decision

- 日志时间戳**始终**用真实墙钟 `time.Now().Format("15:04:05")`，不 mock。
- 加速只作用于**处理时长**：`procDur` 经构造函数注入，运行期由 `-process` flag /
  `PROCESS_SECONDS` 环境变量控制，默认 10s。
- 单测注入极大时长（1h）冻结完成路径，实现无 sleep 的确定性断言。

## Consequences

- CI 与演示输出的时间戳真实可信，满足校验正则。
- 单测不依赖时间推进，`-race` 下稳定。
- 加速模式下 `wait N` 的脚本时序与处理完成时序可能错位——由 `drain` 兜底，仅观感差异。

## Alternatives Considered

- 注入 `clock` 接口全面 mock：单测可控性最强，但 result.txt 时间戳变假或需双轨时间，
  复杂度超出原型范围。

## Related Documents

- [30-design/time-and-acceleration.md](../30-design/time-and-acceleration.md)
- [50-deployment/ci-verification.md](../50-deployment/ci-verification.md)
