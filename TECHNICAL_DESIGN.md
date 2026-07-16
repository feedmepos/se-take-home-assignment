# 技术方案：麦当劳订单控制器（Order Controller）

本文档对应 `README.md` 中的用户故事与需求，描述 Backend CLI 方案的技术设计。

## 1. 目标与范围

### 1.1 目标

实现内存态订单控制器，支持：

- 普通 / VIP 下单进入同一条 `PENDING` 队列（非双队列）
- 队列内 VIP 插队：VIP 在所有 Normal 之前，VIP 之间 FIFO
- 烹饪机器人（Bot）增减与自动接单
- 单订单处理时长 10 秒后进入 `COMPLETE`
- 减 Bot 时中断订单回队，可由其他 Bot 继续处理

### 1.2 非目标

- 不做数据持久化（无 DB / 文件状态恢复）
- 不做真实 UI（本方案走 Backend CLI）
- 不做鉴权、多门店、库存等扩展业务
- 不实现独立的「用户 / 账号」实体（角色只作为操作发起方，见下节）

## 2. 角色与职责

用户故事里的角色需要在方案中保留，但**不必建成 User 表或登录体系**。本原型把角色映射为「谁触发什么操作」：

| 角色 | 诉求 | 系统操作 | 可见结果 |
|---|---|---|---|
| 普通顾客 | 下单后看到流转 | `CreateNormalOrder()` | 订单进 `PENDING`，完成后进 `COMPLETE` |
| VIP 会员 | 优先于普通单，VIP 之间按先后 | `CreateVIPOrder()` | 插在 VIP 区末尾、所有 Normal 之前 |
| 经理 | 增减可用烹饪机器人 | `AddBot()` / `RemoveBot()` | +Bot 立即接单；-Bot 销毁最新 Bot，处理中订单回 `PENDING` |
| 烹饪机器人 | 一次只做一单，每单 10 秒 | 由控制器调度 `processOrder` | `Idle` ↔ `Processing`，完成后继续或空闲 |

关系示意：

```text
普通顾客 ──下普通单──┐
VIP 会员 ──下 VIP 单──┼──► OrderController ──调度──► Bot（处理 10s）
经理 ────± Bot 数量───┘
```

说明：

- **顾客 / VIP**：不存客户档案，只通过订单类型 `Normal` / `VIP` 区分优先级。
- **经理**：不单独建模 Manager 对象，加减 Bot 即其全部能力。
- **机器人**：是系统内真实实体（有状态、可并发），对应领域模型 `Bot`。

## 3. 方案选型

| 项 | 选择 | 理由 |
|---|---|---|
| 形态 | Backend CLI | 满足作业 GitHub Actions 校验要求 |
| 语言 | Go | 并发模型适合多 Bot 同时处理 |
| 状态存储 | 进程内存 | 需求明确无需持久化 |
| 并发 | goroutine + mutex + stop channel | Bot 独立处理，控制器统一调度 |

## 4. 领域模型

系统实体只有 **订单** 和 **机器人**；顾客 / VIP / 经理是操作角色，不单独建实体。

### 4.1 Order（订单）

| 字段 | 说明 |
|---|---|
| `ID` | 唯一且递增 |
| `Type` | `Normal` / `VIP`（对应普通顾客 / VIP 会员下单） |
| `Status` | `PENDING` → `PROCESSING` → `COMPLETE` |
| `CreateAt` | 创建时间 |

状态流转：

```text
新建 → PENDING →（Bot 领取）→ PROCESSING →（满 10s）→ COMPLETE
                              ↑
                     （经理 -Bot 中断）──┘ 回到 PENDING
```

### 4.2 Bot（烹饪机器人）

| 字段 | 说明 |
|---|---|
| `ID` | 唯一递增 |
| `Status` | `Idle` / `Processing` |
| `CurrentOrder` | 当前处理订单（可为空） |
| `stopChannel` | 用于经理 `-Bot` 时中断处理 |

约束：同一时间只处理 1 个订单。

### 4.3 OrderController（控制器）

系统中枢，承接顾客下单与经理调配 Bot：

- `pendingOrders`：待处理订单集合 → `Queue`
- `completedOrders`：已完成订单集合 → `Completed`
- `bots`：当前 Bot 集合 → `BotPool`（`-Bot` 销毁最新一个，LIFO）
- `nextOrderID` / `nextBotID`：发号器

## 5. 核心设计

### 5.1 单队列 + VIP 插队

采用**一条** `PENDING` 队列，不拆成 VIP / Normal 两个队列。优先级靠插入位置保证：

```text
[ VIP1, VIP2, ..., Normal1, Normal2, ... ]
```

- 新 VIP：插到所有 VIP 之后、第一个 Normal 之前
- 新 Normal：追加到队尾
- Bot 始终从队头取单 → 自然保证 VIP 优先

### 5.2 调度：独立 dispatcher 协程（事件唤醒）

业务操作只改数据，然后 `notify()` 唤醒调度协程；调度协程负责把 pending 分给空闲 Bot。

```text
下单 / ±Bot / 完成 ──notify()──► wake ──► dispatchLoop ──► 分配订单
```

`wake` 缓冲为 1，重复唤醒会合并。

### 5.3 Bot 处理与空闲

```text
Bot 领取订单
  → sleep/select 等待 10s
  → 成功：订单 COMPLETE，Bot 变 Idle，再尝试接下一单
  → 被 stop：停止处理，订单已由控制器放回 PENDING
```

无待处理订单时 Bot 保持 `Idle`；新订单到来时由调度函数唤醒接单。

### 5.4 经理操作：+Bot / -Bot

**+Bot**

- 创建新 Bot，追加到列表末尾
- 立即尝试接 `PENDING` 订单

**-Bot**

- 销毁最新 Bot（列表末尾）
- 若正在处理：
  - 通过 `stopChannel` 停止 goroutine
  - 订单状态改回 `PENDING`
  - 按类型插回队列（VIP 插 VIP 区，Normal 放队尾）
  - 再调度，让剩余 Bot 接手

### 5.5 并发与线程安全

按资源拆锁（比单把大锁更细），多锁时**固定顺序**防止死锁：

```text
1. bots.mu       → 封装在 BotPool 内部
2. pending.mu    → 封装在 Queue 内部
3. completed.mu  → 封装在 Completed 内部（COMPLETE 区域）
```

发号器（`nextOrderID` / `nextBotID` / `totalCreated`）用 `atomic`，不加锁。

调度时先看 `HasIdle`，再 `Dequeue`，最后 `AssignToIdle`。


### 5.6 可配置处理时长（测试用）

```text
Config.ProcessDuration 默认 = 10s
测试通过 NewControllerWithConfig 传入更短时长（如 150ms）
```

生产模拟与 CLI 演示仍使用 10 秒。

## 6. 目录结构

按常见 Go 工程约定组织（`cmd` 放入口、`internal` 放不对外暴露的业务代码；本应用非公共库，不使用 `pkg/`）：

```text
.
├── cmd/
│   └── order-controller/
│       └── main.go                 # CLI 入口：组装依赖，跑演示编排
├── internal/
│   └── order/
│       ├── config.go               # 运行配置（如处理时长）
│       ├── model.go                # Order / Bot 等领域类型与状态
│       ├── queue.go                # PENDING 单队列与 VIP 插队
│       ├── completed.go            # COMPLETE 完成区
│       ├── bots.go                 # Bot 池（加减机器人）
│       ├── controller.go           # 调度与对外操作 API
│       ├── controller_test.go      # 单元测试（与实现同包）
│       └── e2e_test.go             # Backend E2E（用户故事级）
├── scripts/
│   ├── test.sh                     # 跑单元测试 + E2E
│   ├── build.sh                    # 编译 CLI 产物
│   ├── run.sh                      # 执行 CLI，写出 result.txt
│   └── result.txt                  # 运行输出（含 HH:MM:SS）
├── go.mod
├── go.sum
└── README.md
```

约定说明：

| 路径 | 约定 |
|---|---|
| `cmd/order-controller/` | 每个可执行程序一个子目录，`main` 保持轻薄 |
| `internal/order/` | 业务私有包，禁止被其他 module 引用 |
| `*_test.go` 与代码同目录 | Go 默认测试布局 |
| `scripts/` | 作业要求的 CI 脚本入口 |

构建产物建议输出到仓库根目录或 `bin/`（如 `bin/order-controller`），由 `build.sh` / `run.sh` 约定即可。

## 7. 对外操作（角色 → 动作）

| 角色 | 用户动作 | 控制器方法 | 结果 |
|---|---|---|---|
| 普通顾客 | New Normal Order | `CreateNormalOrder()` | 订单进 PENDING 队尾 |
| VIP 会员 | New VIP Order | `CreateVIPOrder()` | 订单进 VIP 区末尾 |
| 经理 | + Bot | `AddBot()` | 新建 Bot 并立即尝试接单 |
| 经理 | - Bot | `RemoveBot()` | 销毁最新 Bot；处理中订单回 PENDING |
| 机器人 | （系统调度） | `processOrder` | 10s 后 COMPLETE，或被中断回队 |

CLI 演示按固定脚本依次扮演上述角色调用方法，日志带 `HH:MM:SS` 时间戳，输出到 `scripts/result.txt`。

## 8. 日志约定

关键事件打点，格式：

```text
[HH:MM:SS] <事件描述>
```

至少覆盖：

- 创建 Normal / VIP 订单（顾客 / VIP）
- Bot 创建 / 销毁（经理）
- Bot 领取订单（PROCESSING）
- Bot 完成订单（COMPLETE，含处理耗时）
- Bot 进入 IDLE

## 9. 测试策略

### 9.1 单元测试

覆盖单点行为：建单、VIP 插队、加减 Bot、处理中减 Bot、完成、空队列 Idle。

### 9.2 Backend E2E

按用户故事（角色视角）串联断言：

1. 普通顾客：下单进 PENDING，完成后进 COMPLETE
2. VIP 会员：排在 Normal 前、VIP 之间 FIFO
3. 订单号唯一递增
4. 经理 +Bot：接单 → 等待处理时长 → COMPLETE → 继续下一单
5. 机器人：队列空时 Idle，新单到来自动恢复
6. 经理 -Bot：中断后订单回队并由其他 Bot 接手
7. 完整故事：多角色操作串联

执行：

```bash
./scripts/test.sh
```

## 10. 需求映射

| 需求 | 角色 | 设计落点 |
|---|---|---|
| 1 Normal 进 PENDING | 普通顾客 | `CreateNormalOrder` + `pendingQueue` |
| 2 VIP 插队规则 | VIP 会员 | VIP 插入算法 |
| 3 订单号唯一递增 | — | `nextOrderID` |
| 4 +Bot 处理 10s 后 COMPLETE 并继续 | 经理 + 机器人 | `AddBot` + `processOrder` + 再调度 |
| 5 无单时 IDLE | 机器人 | 完成后无 pending 则保持 Idle |
| 6 -Bot 回队可被其他 Bot 处理 | 经理 + 机器人 | `RemoveBot` + `tryAssignOrderToBot` |
| 7 内存处理 | — | 无持久化层 |

## 11. 风险与取舍

| 点 | 说明 |
|---|---|
| 角色不落库 | 顾客/VIP/经理只作为操作来源，避免过度建模 |
| 固定 10s 处理 | 演示真实，测试用 `Config.ProcessDuration` 加速 |
| 无 UI | 符合 Backend 选项；行为通过日志与测试验证 |
| 单进程内存 | 重启即清空，符合原型范围 |
| 不做过度抽象 | 控制器内聚，避免引入消息队列/框架 |

## 12. 实施步骤建议

1. 在 `internal/order/` 实现模型、队列与控制器调度
2. 按角色操作补单元测试与 E2E
3. 写 `cmd/order-controller/main.go` 演示编排，依次模拟顾客 / VIP / 经理操作
4. 接好 `scripts/{test,build,run}.sh`，保证 Actions 通过
5. 核对 `scripts/result.txt` 含 `HH:MM:SS` 时间戳

