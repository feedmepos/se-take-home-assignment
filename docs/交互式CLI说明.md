# 交互式 CLI 说明（`feedme interactive`）

本文档说明面试/本地演示用的**交互式**子命令。该模式从标准输入逐行读命令，**不参与** CI 中的 `scripts/run.sh`（CI 仅使用 `run-demo` 写入 `scripts/result.txt`）。

## 启动方式

在仓库根目录先编译或直接使用 `go run`：

```bash
go build -o bin/feedme ./cmd/feedme
./bin/feedme interactive
```

或：

```bash
go run ./cmd/feedme interactive
```

**提示符**：`feedme> `。界面与回显文案为**英文**（与作业 README 一致）。

## 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| `FEEDME_PROCESS_MS` | 每单处理时长（毫秒），自进入 PROCESSING 起计时 | `10000`（10 秒） |

与 `run-demo` 不同，交互模式**不**读取 `FEEDME_DEMO_FAST`；若需快速试跑，请设置较小的 `FEEDME_PROCESS_MS`（例如 `500`）。

## 命令一览

每行输入一条命令（区分大小写，需与下表完全一致）。空行忽略。

| 输入 | 别名 | 行为 |
|------|------|------|
| `n` | — | 新建 **Normal** 订单，进入 PENDING 队列（排在全部 VIP 之后） |
| `v` | — | 新建 **VIP** 订单，进入 PENDING（排在已有 VIP 之后、全部 Normal 之前） |
| `+` | — | 增加一台 Bot；若 PENDING 有待处理单，会按规则立即派单 |
| `-` | — | 移除**最新创建**的 Bot（id 最大）。若该 Bot 正在处理订单，会取消处理并将订单按类型与订单号规则插回 PENDING；若无任何 Bot，打印 `error: no bot to remove` |
| `s` | — | 打印当前快照：PENDING、PROCESSING、COMPLETE、BOTS（英文标签） |
| `q` | `quit` | 退出程序 |
| `help` | `?` | 打印内置帮助（英文） |

其他输入会提示：`unknown command, type help`。

## 状态输出含义（`s` 命令）

- **PENDING**：`#订单号(kind)`，`kind` 为 `normal` 或 `vip`；顺序为先全部 VIP（FIFO），再全部 Normal（FIFO）。
- **PROCESSING**：当前正被某 Bot 处理的订单。
- **COMPLETE**：已完成订单号列表。
- **BOTS**：`id=机器人号 IDLE` 或 `id=机器人号 order=订单号`（处理中）。

行首时间戳格式为 `HH:MM:SS`（与 `result.txt` 风格一致，便于对照）。

## 与 `run-demo` 的区别

| 项目 | `interactive` | `run-demo` |
|------|----------------|------------|
| 输入 | stdin 交互 | 无输入，固定脚本 |
| 用途 | 面试演示、手工探索 | CI / `run.sh` 生成 `scripts/result.txt` |
| 退出 | 用户输入 `q` / `quit` | 跑完固定步骤后退出 |

## 相关文档

- [实施细节补充.md](实施细节补充.md) §5.2（交互命令约定）
- [架构与接口设计.md](架构与接口设计.md)（CLI 子命令划分）
- [本地测试说明.md](本地测试说明.md)（环境与本机验证）
