# 麦当劳订单控制器 — 设计规格

**日期：** 2026-07-29  
**范围：** 仅 Go 后端 CLI（交互模式 + demo 模式）  
**方案：** Controller + 每个 Bot 一个 goroutine

## 目标

实现一个内存态订单控制器 CLI，满足：

1. 普通 / VIP 订单进入 PENDING 区域
2. VIP 优先于普通（同类型内 FIFO）
3. 支持增减烹饪机器人；每个 Bot 同时只处理一单
4. 每单处理时长可配置（默认 10 秒）
5. 中途销毁 Bot 时，订单按 VIP/普通优先级回到 PENDING
6. 日志带时间戳（`HH:MM:SS`），CI 写入 `scripts/result.txt`
7. 通过 GitHub Actions `backend-verify-result` 工作流

不在范围内：前端 UI、数据持久化、网络 API。

## 架构

```
cmd/order-controller/main.go   # flag 解析、模式选择
internal/order/                # Order 模型与状态
internal/bot/                  # Bot 模型与生命周期辅助
internal/controller/           # 线程安全队列、Bot 池、调度
internal/cli/                  # 交互 REPL + demo 场景
scripts/{test,build,run}.sh
scripts/result.txt             # 由 run.sh 生成
```

| 模块 | 职责 |
|------|------|
| `order` | Order 结构体，类型（`NORMAL`/`VIP`），状态（`PENDING`/`PROCESSING`/`COMPLETE`） |
| `bot` | Bot 结构体，状态（`IDLE`/`PROCESSING`），cancel context |
| `controller` | PENDING/COMPLETE 列表、VIP 插队、Bot 池、互斥保护操作 |
| `cli` | 命令解析、交互循环、demo 编排、日志输出 |

## 数据模型

### Order

- `ID` — 唯一且单调递增，从 1 开始
- `Type` — `NORMAL` | `VIP`
- `Status` — `PENDING` | `PROCESSING` | `COMPLETE`

### Bot

- `ID` — 唯一且单调递增，从 1 开始
- `Status` — `IDLE` | `PROCESSING`
- `CurrentOrder` — 当前处理订单（可空）
- 通过 `context.Context` 支持 `-bot` 取消

### PENDING 队列规则

1. 普通订单 → 追加到队尾
2. VIP 订单 → 插到所有现有 VIP 之后、第一个普通订单之前
3. 被中断回队的订单使用同一套规则（按类型优先级，不按原下标硬插）

示例：`[VIP#1, VIP#2, N#3, N#4]`

- 新建 VIP → `[VIP#1, VIP#2, VIP#5, N#3, N#4]`
- 新建普通 → `[VIP#1, VIP#2, N#3, N#4, N#6]`

### COMPLETE

按完成时间追加；不再参与调度。

## Bot 生命周期与并发

### `+ Bot`

1. 创建 Bot，加入池（保留创建顺序；`-bot` 销毁最新）
2. 启动 goroutine 循环：
   - 从 PENDING 取队首 → 标记为 `PROCESSING`
   - 若无单 → 标记为 `IDLE`，等待新订单或销毁信号
   - 若已领单 → `select`：`time.After(processTime)` 完成，或 `ctx.Done()` 回队

### `- Bot`

1. 取出池中最新 Bot 并 cancel 其 context
2. 若正在处理：订单状态改回 `PENDING`，按 VIP/普通规则回插
3. goroutine 退出，Bot 销毁

### 并发约定

- `OrderController` 用一把 `sync.Mutex` 保护队列与 Bot 列表
- 状态变更仅在持锁时进行；`Sleep`/等待在锁外
- 新订单到达时通过 `sync.Cond`（同一把 mutex 上 `Broadcast`）唤醒空闲 Bot
- flag `-process-time`（默认 `10s`）；demo/测试可用 `100ms`

## CLI 接口

### Flags

- `-demo` — 非交互 demo 场景，跑完退出
- `-process-time` — 订单处理时长（默认 `10s`）

### 交互命令

| 命令 | 作用 |
|------|------|
| `n` / `new normal` | 新建普通订单 |
| `v` / `new vip` | 新建 VIP 订单 |
| `+` / `+bot` | 增加机器人 |
| `-` / `-bot` | 销毁最新机器人 |
| `s` / `status` | 打印 PENDING / PROCESSING / COMPLETE / Bots |
| `q` / `quit` | 退出 |

关键事件日志均带 `[HH:MM:SS]` 前缀。

### Demo 场景（`-demo`）

供 CI / `run.sh` 使用：

1. 创建普通、VIP、普通 — 日志体现 VIP 插队
2. `+bot` 两次 — 并行处理
3. 等待完成；再下 VIP — 空闲 bot 立即接手
4. `-bot`（含空闲销毁等情形）
5. 向 stdout 打印最终汇总

## 脚本

- `scripts/test.sh` → `go test ./... -v`
- `scripts/build.sh` → `go build -o bin/order-controller ./cmd/order-controller`
- `scripts/run.sh` → `./bin/order-controller -demo -process-time=100ms > scripts/result.txt`

## 测试

单测重点：

1. VIP 相对普通订单的插队顺序
2. 订单号唯一且递增
3. `+bot` 立即从 PENDING 取单
4. `-bot` 中断后按优先级回 PENDING
5. 多 Bot 并行处理
6. 空闲 Bot 在新订单到达时被唤醒

测试中使用较短处理时长（或向 controller 注入 duration）。

## 交付

1. 在功能分支上实现
2. 向 `main` 开 Pull Request
3. 确保 `backend-verify-result` 通过（`result.txt` 非空且含 `HH:MM:SS`）

## 决策记录

| 决策点 | 选择 |
|--------|------|
| CLI 模式 | 交互 + `-demo` 双模式 |
| 处理时长 | 通过 `-process-time` 可配置（默认 10s） |
| 交付范围 | 仅 Go 后端 CLI |
| 并发模型 | 每 Bot 一个 goroutine + 互斥保护的 controller |
