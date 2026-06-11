# 麦当劳订单控制器 — 架构设计文档

> 文档驱动开发：本文件先于代码落地，作为实现与验收的依据。代码完成后若行为有调整，需回写本文档。

## 1. 背景与目标

实现一个**订单流转控制器** CLI：模拟麦当劳自动烹饪机器人处理 Normal / VIP 订单。

形态（已与需求方对齐）：
- **交互模式**：从 stdin 读命令，实时处理（满足下一轮面试的交互式 CLI 要求）。
- **批处理模式**：`run.sh` 通过 here-doc 把一段命令脚本 piped 进**同一个**命令解析器，输出到 `scripts/result.txt` 供 CI 校验。

一份输入解析器两用，避免逻辑分叉。

## 2. 模块划分

```
go.mod                                  模块定义 (module order-controller, go 1.23)
cmd/order-controller/main.go            入口：flag 解析、REPL 命令循环、模式无关
internal/controller/
    order.go                            Order、OrderType（领域模型）
    queue.go                            PriorityQueue（VIP/Normal 优先级队列，纯数据结构）
    queue_test.go                       队列单测
    controller.go                       Controller 引擎：bot 生命周期、分配、完成、销毁
    controller_test.go                  引擎单测
scripts/build.sh                        go build
scripts/test.sh                         go test ./...
scripts/run.sh                          构建 + 喂入演示脚本 → result.txt
docs/ARCHITECTURE.md                    本文档
```

**职责边界**：
| 模块 | 职责 | 不负责 |
|------|------|--------|
| `order.go` | 订单数据与字符串表示 | 顺序、并发 |
| `queue.go` | VIP/Normal 优先级入队/出队，纯同步、无锁、无时间 | bot、并发、日志 |
| `controller.go` | 状态机：持锁管理 pending/completed/bots，分配与并发处理 | 命令解析、I/O 格式 |
| `main.go` | 命令解析、flag、`wait`/`drain` 等编排 | 业务规则 |

分层原则：`main → controller → queue/order`，下层不依赖上层。队列是优先级规则的唯一真相源，可独立、确定性地测试。

## 3. 领域模型

```go
type OrderType int   // Normal=0, VIP=1
type Order struct { ID int; Type OrderType }   // ID 全局唯一、递增
type Bot   struct { id int; order *Order; cancel context.CancelFunc }
```

`Controller` 状态（均由单一 `sync.Mutex` 保护）：
- `pending  *PriorityQueue` — 待处理区
- `completed []*Order` — 完成区
- `bots     []*Bot` — 活跃机器人，slice 末尾为"最新"
- `nextOrderID, nextBotID int` — 递增计数器
- `procDur time.Duration` — 单订单处理时长（默认 10s，可注入加速）
- `out io.Writer` — 日志输出目标（stdout，CI 由 run.sh 重定向到 result.txt）

## 4. 核心流程

### 4.1 优先级队列（queue.go）
队列恒为 `[VIP..., Normal...]` 有序。
- **Enqueue(Normal)**：追加到末尾。
- **Enqueue(VIP)**：插入到"最后一个 VIP 之后、第一个 Normal 之前"（即下标 = 当前 VIP 数量）→ VIP 排在所有现有 VIP 之后、所有 Normal 之前。
- **Dequeue()**：弹出队首（最高优先级）。

### 4.2 下单
`AddNormalOrder` / `AddVIPOrder`：持锁 → 生成递增 ID → 入队 → 日志 `Created ... PENDING` → 尝试把订单派给某个 IDLE bot（`assignToIdleBot`）。

### 4.3 增加机器人 `+bot`
持锁 → 创建 bot（IDLE）并入 `bots` → 日志 `Bot #x created ACTIVE` → 立即尝试领取一个 pending 订单。

### 4.4 分配与处理（assign → process → complete）
- `assign(bot)`（持锁，bot 必须空闲）：从队首 Dequeue；无单则置 IDLE 并日志；有单则绑定 `bot.order`、建 `context`、日志 `picked up ... PROCESSING`，起一个 goroutine：
  ```
  select {
    case <-time.After(procDur): controller.complete(bot)   // 正常完成
    case <-ctx.Done():          return                       // 被销毁中止
  }
  ```
- `complete(bot, o)`（持锁）：**guard——若 `bot.order != o`（订单已被销毁退回，或 bot 已领了别的单）则直接返回**，防止竞态双处理（比 nil 检查更强，顺带防 ABA）；否则把订单移入 completed、日志 `completed ... COMPLETE`、清空 `bot.order`，再 `assign` 下一单。

### 4.5 减少机器人 `-bot`
持锁 → 取 slice 末尾（最新）bot：
- 若正在处理：`cancel()` 中止 → 把订单按优先级规则**重新入队**（退回原区，维持 VIP/Normal 优先级）→ 日志 `destroyed while processing, order returned` → **若存在 IDLE bot，立即把退回单派给它**（否则订单会滞留 pending、`drain` 永不结束——实测发现并修复）。
- 若 IDLE：日志 `destroyed while idle`。
- 从 `bots` 移除。

### 4.6 编排命令（main.go）
- `wait N`：阻塞输入循环 N 秒（让后台 bot 推进），用于制造"处理中销毁"等时序场景。
- `drain`：轮询（100ms）直到 pending 为空且所有 bot IDLE——时长无关地等全部完成，批处理收尾用。
- `status`：打印 Final Status 汇总。
- `quit`/EOF：退出。

## 5. 命令集

| 命令 | 别名 | 作用 |
|------|------|------|
| `normal` | `n` | 新建 Normal 订单 |
| `vip` | `v` | 新建 VIP 订单 |
| `+bot` | `+`, `addbot` | 增加机器人 |
| `-bot` | `-`, `removebot` | 销毁最新机器人 |
| `status` | `s` | 打印当前/最终状态 |
| `wait N` | `w` | 等待 N 秒（编排） |
| `drain` | `d` | 阻塞至全部处理完成 |
| `help` | `h` | 帮助 |
| `quit` | `q`, `exit` | 退出 |

## 6. 时间与加速

- 处理时长由 flag `-process`（duration）/ 环境变量 `PROCESS_SECONDS` 注入，默认 **10s**。
- 日志时间戳始终为真实墙钟 `HH:MM:SS`（`time.Now().Format("15:04:05")`），满足 CI 正则 `[0-9]{2}:[0-9]{2}:[0-9]{2}`。
- 单测把 `procDur` 设为很大（如 10s），使 bot 停在 PROCESSING 不触发完成，从而**无 sleep、确定性**验证分配/退回逻辑。
- `run.sh` 默认真实 10s 产出真实演示输出；可 `PROCESS_SECONDS=1 ./scripts/run.sh` 加速。

## 7. 验收标准

**功能（对应 README 需求 1-7）**
1. `normal` → 订单进入 PENDING。
2. `vip` → 进入 PENDING，排在所有 Normal 之前、所有现有 VIP 之后。
3. 订单号唯一且递增。
4. `+bot` → 立即处理 pending，10s 后移入 COMPLETE，再取下一单。
5. 无 pending 时 bot 变 IDLE。
6. `-bot` → 销毁最新 bot；处理中则中止，订单按优先级退回 PENDING。
7. 全程内存态，无持久化。

**CI（backend-verify-result）**
- `test.sh` / `build.sh` / `run.sh` 依次执行无报错（exit 0）。
- `scripts/result.txt` 存在、非空、且包含 `HH:MM:SS` 时间戳。
- 走 GitHub Flow，PR 到 main，workflow 通过。

## 8. 测试覆盖

**queue_test.go（纯逻辑，确定性）**
- VIP/Normal 混合入队后顺序正确（VIP 全部在 Normal 前，组内 FIFO）。
- 连续 VIP 入队组内保持 FIFO。
- 空队列 Dequeue 返回 nil。
- Len 统计正确。

**controller_test.go（注入大 procDur，无 sleep）**
- 订单 ID 唯一且递增。
- `+bot` 优先领取 VIP 订单（混合下单后断言 bot.order 为 VIP）。
- `-bot` 处理中销毁 → 订单退回 pending 且维持优先级；bots 减少。
- `-bot` 处理中销毁且存在 IDLE bot → 退回单立即被 IDLE bot 领取，不滞留。
- `-bot` IDLE 销毁 → 仅移除 bot，不影响订单。
- 无 pending 时 `+bot` 后 bot 处于 IDLE。

**集成验证**：`run.sh` 端到端跑演示脚本，人工核对 result.txt 行为与时间戳。

## 9. 边界情况与并发处理

| 情况 | 处理 |
|------|------|
| 销毁瞬间 bot 恰好完成（time.After 与 ctx.Done 竞态） | `complete(bot, o)` 持锁后检查 `bot.order != o`，已被销毁则直接返回，避免订单被同时"完成"和"退回"导致双处理 |
| 退回单滞留：销毁时其他 bot 恰好 IDLE | `RemoveBot` 重新入队后立即尝试派给 IDLE bot，否则没有任何事件会再触发分配，`drain` 死等 |
| 无 bot 时下单 | 订单留在 pending，等 `+bot` 领取 |
| 无 pending 时 `+bot` | bot 进入 IDLE，待新单到来时由下单流程派发 |
| 无 bot 时 `-bot` | 空操作（提示无 bot 可销毁） |
| 处理中订单退回后的"原位置" | 按优先级规则重新入队：VIP 退回时排在当前 VIP 队尾。注：若处理期间有新 VIP 进入，退回单会排其后——已知简化，1 小时原型范围内可接受，文档明示 |
| EOF / 未 quit 退出 | 直接退出，后台未完成订单丢弃（内存态，符合无持久化） |
| 非法命令 / 缺参数（如 `wait` 无数字） | 打印提示，不崩溃，继续读下一条 |
| 加速模式下 `wait` 与 procDur 不匹配 | `drain` 兜底，保证逻辑正确（仅时序观感差异） |

## 10. 非目标（不做，避免过度设计）

- 无持久化 / 数据库。
- 无 HTTP/Web 服务（后端 CLI 选项）。
- 不实现订单取消、超时、错误重试等需求外功能。
- 不引入第三方依赖，仅用标准库。
