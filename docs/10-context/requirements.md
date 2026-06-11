# 需求与验收标准

## 背景与目标

实现一个**订单流转控制器** CLI：模拟麦当劳自动烹饪机器人处理 Normal / VIP 订单。

形态（已与需求方对齐）：
- **交互模式**：从 stdin 读命令，实时处理（满足下一轮面试的交互式 CLI 要求）。
- **批处理模式**：`run.sh` 通过 here-doc 把一段命令脚本 piped 进**同一个**命令解析器，输出到 `scripts/result.txt` 供 CI 校验。

一份输入解析器两用，避免逻辑分叉。

## 功能验收（对应 README 需求 1-7）

1. `normal` → 订单进入 PENDING。
2. `vip` → 进入 PENDING，排在所有 Normal 之前、所有现有 VIP 之后。
3. 订单号唯一且递增。
4. `+bot` → 立即处理 pending，10s 后移入 COMPLETE，再取下一单。
5. 无 pending 时 bot 变 IDLE。
6. `-bot` → 销毁最新 bot；处理中则中止，订单按优先级退回 PENDING。
7. 全程内存态，无持久化。

CI 验收见 [50-deployment/ci-verification.md](../50-deployment/ci-verification.md)。

## 非目标（不做，避免过度设计）

- 无持久化 / 数据库。
- 无 HTTP/Web 服务（后端 CLI 选项）。
- 不实现订单取消、超时、错误重试等需求外功能。
- 不引入第三方依赖，仅用标准库。
