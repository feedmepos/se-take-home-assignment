# CLI 命令集

同一解析器服务交互模式（stdin REPL）与批处理模式（run.sh here-doc）。
空行与 `#` 开头的行忽略；非法命令打印提示后继续。

| 命令 | 别名 | 作用 |
|------|------|------|
| `normal` | `n` | 新建 Normal 订单 |
| `vip` | `v` | 新建 VIP 订单 |
| `+bot` | `+`, `addbot` | 增加机器人 |
| `-bot` | `-`, `removebot` | 销毁最新机器人 |
| `status` | `s` | 打印当前/最终状态 |
| `wait N` | `w` | 等待 N 秒（编排，支持小数） |
| `drain` | `d` | 阻塞至全部处理完成 |
| `help` | `h` | 帮助 |
| `quit` | `q`, `exit` | 退出（EOF 同效） |

## Flag 与环境变量

| 项 | 默认 | 说明 |
|----|------|------|
| `-process <duration>` | `10s` | 单订单处理时长，优先级最高 |
| `PROCESS_SECONDS=<float>` | — | 以秒为单位的加速入口，供脚本使用 |

## 日志格式

每条事件一行：`[HH:MM:SS] <事件> - Status: <PENDING|PROCESSING|COMPLETE|...>`，
时间戳为真实墙钟（CI 依赖此格式，见
[50-deployment/ci-verification.md](../50-deployment/ci-verification.md)）。
