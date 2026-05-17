# FeedMe 麦当劳订单控制器 — 自上而下方案设计（Go 后端 + Web 前端）

本文档在 [README.md](./README.md) 功能需求之上，补充工程化目标：**REST API → Service → Repository + Domain** 分层、**分阶段交付与测试**、**订单并发与异常态**、**双队列 + 多 Worker（Bot）异步轮询**、以及 **AWS EC2 部署脚本**（可先暂停 `dota2master` / `dota2-web` 容器）。

**`-Bot` 行为（与 README 要求 6 一致）**：销毁**最新创建**的那台 Bot；若该 Bot **正在处理**订单，则 **立即终止**本轮烹饪（取消 `context` / 停止 timer），订单从 `processing` 回到 **`pending`**，并 **按原 VIP/Normal 子队列内的相对位置插回**（不破坏 VIP 整体优先于 Normal 的结构）。

---

## 1. 自上而下总览

### 1.1 系统边界

| 组件 | 职责 |
|------|------|
| **Web 前端** | 操作：新建 Normal/VIP 单、`+Bot`/`-Bot`、展示 PENDING / PROCESSING / COMPLETE / EXCEPTION 四区；轮询或 SSE/WebSocket 拉状态（实现阶段可选 SSE）。 |
| **Go HTTP API** | 无持久化下的**唯一写入口**；鉴权可省略（原型）；将请求委托给 **Application Service**。 |
| **Application Service** | 用例编排：建单、扩缩 Bot、查询快照；协调 **Domain + Repo** 与 **Worker 调度器**；保证并发安全。 |
| **Worker 调度器 + Bot Worker** | 多个 Bot goroutine **轮询/阻塞等待**「下一单」；从 **VIP / Normal 双通道** 按优先级出队；处理 10s；错误时转 **EXCEPTION**。 |
| **Repository（内存）** | 订单表、Bot 表、完成列表、序号生成器；仅被 Service 通过接口调用。 |
| **Domain** | 纯规则：订单状态机、入队位置规则、优先级比较、异常分类；可单测。 |

### 1.2 前端技术选型（固定）

- **Vite + TypeScript + React**：与 CI 已安装的 Node 22 对齐；组件化展示 PENDING / PROCESSING / COMPLETE / EXCEPTION 四区及 `+Bot`/`-Bot`；HTTP 使用 `fetch` 轮询 `GET /orders/snapshot`（后续如需可再加 SSE）。
- 源码目录建议：`web/`（Vite 根目录），构建产物由 `npm run build` 生成，经 `embed.FS` 嵌入 `cmd/server` 或由反向代理托管。

### 1.3 后端形态与作业 CI（双入口）

| 入口 | 用途 |
|------|------|
| `cmd/server`（或 `orderctl serve`） | 本地/EC2：HTTP + 静态资源（`embed` 或 nginx 反代）。 |
| `cmd/orderctl`（`--demo` 非交互） | **GitHub Actions**：跑固定场景，stdout 重定向到 `scripts/result.txt`，行内带 `HH:MM:SS`（与 [backend-verify-result.yaml](.github/workflows/backend-verify-result.yaml) 一致）。 |

**共享核心**：`internal/domain`、`internal/repository/memory`、`internal/service`、`internal/worker` 被 HTTP 与 CLI **复用**，避免两套逻辑。

---

## 2. API 设计（先契约，后实现）

Base URL：`/api/v1`。所有响应 JSON；错误时 `4xx/5xx` + `{ "error": "code", "message": "..." }`。

### 2.1 订单

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/orders` | 创建订单。Body：`{ "tier": "normal" \| "vip" }`。返回完整 `Order`。 |
| `GET` | `/orders/snapshot` | **聚合视图**：`pending[]`, `processing[]`, `complete[]`, `exception[]`, `bots[]`；供前端一次刷新。 |
| `POST` | `/orders/{id}/retry` | （可选）人工确认后将 `EXCEPTION` 订单按规则重新进入 PENDING（见 5.3）。 |

**Order DTO 字段建议**

- `id`：uint64，全局唯一递增。
- `tier`：`vip` | `normal`。
- `status`：`pending` | `processing` | `complete` | `exception`。
- `assigned_bot_id`：可空。
- `position_hint`：同级队列内顺序（可选，用于 UI 展示「相对位置」）。
- `error_code` / `error_message`：仅 `exception` 时有值。
- `created_at` / `started_at` / `completed_at`：RFC3339 或 Unix 毫秒。

### 2.2 Bot（烹饪机器人）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/bots` | `+Bot`：新增一台 Bot，**立即**参与抢单（满足 README「立刻处理」）。 |
| `DELETE` | `/bots/{id}` | `-Bot`：**立即销毁**该 Bot（见第 6 节）；若正在处理订单则 **中断** 并将订单退回 PENDING。UI 可约定 `DELETE /bots/latest` 对应 README「减最新一台」。 |
| `GET` | `/bots` | 列出 Bot：`id`, `state`（`idle` \| `working` \| `stopped`）。 |

### 2.3 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/healthz` | 200 OK，部署探活。 |

---

## 3. Service 层设计

### 3.1 接口边界（示意）

```go
// 应用服务：唯一持有「调度器句柄」与「Repo」的地方。
type KitchenService interface {
    CreateOrder(ctx context.Context, tier Tier) (*Order, error)
    AddBot(ctx context.Context) (*Bot, error)
    RemoveBot(ctx context.Context, botID BotID) error // 取消处理中任务并销毁 Bot，见第 6 节
    Snapshot(ctx context.Context) (*KitchenSnapshot, error)
    RetryOrder(ctx context.Context, orderID OrderID) error // 可选
}
```

### 3.2 用例规则

- **CreateOrder**：调用 `OrderIDGenerator.Next()`；根据 Tier 计算在 **VIP/Normal 子队列**中的入队位置（与 README 2 一致）；持久在内存 Repo；**不直接唤醒 Worker**（Worker 阻塞在 channel 上，新单写入后 `select` 通知或关闭占位 token，见第 7 节）。
- **AddBot**：注册 Bot、启动 goroutine；状态 `idle`。
- **RemoveBot**：选中目标 Bot（**LIFO**：最新创建的 Bot 优先被减，与 README 一致）。若其 **空闲**：直接从调度器移除。若其 **处理中**：向该 Bot 的 `context` 发送 **cancel**（或等价信号），Worker 在收到取消后 **不得**将订单标为 `complete`；调用 `RequeuePending(orderID, tier, indexInTier)` 将订单恢复为 `pending` 并插回双子队列的 **原下标位置**；随后移除该 Bot。
- **Snapshot**：只读遍历 Repo；需与写路径 **同一把大锁** 或 **版本号 + copy-on-write 快照**，避免撕裂读（见第 7 节）。

---

## 4. Repository + Domain

### 4.1 Domain（纯模型与规则）

- **枚举**：`Tier`、`OrderStatus`、`BotState`、`ExceptionKind`（网络/内部/超时/未知）。
- **不变量**：
  - 单号全局单调递增（README 3）。
  - `processing` 订单至多绑定一个 `bot_id`。
  - VIP 全体优先于 Normal；同级 FIFO（README 2）。
- **状态机**（含异常与 `-Bot` 回队）：

```text
pending -> processing -> complete
    ^          |
    |          +----> exception（不可恢复错误）
    +----------+---- Requeue（-Bot 取消：processing -> pending，保持同级顺序）
```

- **值对象**：`OrderID`, `BotID` 类型别名，避免混用。

### 4.2 Repository（内存实现）

| 聚合 | 存储结构 | 说明 |
|------|-----------|------|
| 订单 | `map[OrderID]*Order` + VIP/Normal **双 deque 或 slice 存 id** | 出队 O(1) 头部；入队按规则 append 或 insert。 |
| Bot | `map[BotID]*Bot` + 有序切片维护创建顺序 | LIFO `-Bot` 取「最后创建」。 |
| 完成列表 | `[]OrderID` 或时间有序 slice | UI「COMPLETE 区」。 |
| 异常列表 | `[]OrderID` | 待人工确认，**绝不丢弃**（你的要求 8）。 |

**接口示例**（实现可微调命名）：

```go
type OrderRepository interface {
    NextOrderID() OrderID
    SaveOrder(o *Order)
    GetOrder(id OrderID) (*Order, error)
    EnqueuePending(tier Tier, id OrderID) // 按 README 规则插入子队列
    DequeueNext() (OrderID, Tier, bool) // 先 VIP 再 Normal
    RequeueToPending(id OrderID, tier Tier, indexInTier int) // -Bot 中断时恢复同级队列位置
    ListByStatus(status OrderStatus) []*Order
}
```

Domain 不依赖 HTTP；Repo 不启动 goroutine（避免层次倒置）。

---

## 5. 订单异常处理（EXCEPTION）

### 5.1 触发场景（示例）

- 内部断言失败、未知状态转换。
- 未来扩展：回调外部设备失败（原型可无外部 IO）。
- **处理超时**：若将来允许可配置 `cook_duration`，超时也进 `EXCEPTION`。

### 5.2 行为约定

- 订单进入 `exception` 后：**不出现在 PENDING 抢单队列**；出现在 `exception` 快照区。
- **不丢弃**：内存中永久保留至进程结束；日志/result.txt 打 `HH:MM:SS` 记录。
- **人工确认**：`POST /orders/{id}/retry` 将状态改回 `pending` 并按 **原 VIP/Normal 等级** 插回子队列尾部（或「插队规则」可配置），避免自动重试风暴。

### 5.3 与 README 的关系

README 未要求 EXCEPTION；作为**扩展状态**不破坏 PENDING/COMPLETE 演示，前端增加第四区即可。

---

## 6. `-Bot`：立即停止处理并退回 PENDING（README 要求 6）

### 6.1 目标

- **同一 Bot 同一时刻最多处理一单**（README Bot 约束）。
- **`-Bot` 不丢单**：处理中被中断的订单 **不进入** `complete`，而是回到 **PENDING**，且 **VIP/Normal 优先级结构不变**（同级内回到 **原位置**）。

### 6.2 实现要点

1. **出队时记录「回插锚点」**：`Dispatcher` 将订单从 `pendingVIP` / `pendingNormal` 弹出并交给某 Bot 时，在订单元数据上保存 `tier` 与 **`indexInTier`（弹出前在该子队列中的下标）**；或使用单调 `sequence` 键在回插时排序（二选一，推荐 `tier+indexInTier` 与题意最直接）。
2. **烹饪过程可取消**：Bot 内使用 `select` + `context.Context` 包裹 **10s**（`time.After` 或与 `clock` 抽象配合）；`RemoveBot` 对该 Bot 执行 **cancel**。
3. **取消后的提交顺序**（避免竞态）：
   - 在 **同一把** 与队列一致的锁内：将订单状态从 `processing` 改回 `pending`，清空 `assigned_bot_id`，调用 `RequeueToPending(...)`；
   - **忽略**取消已晚于「正常完成」的竞态：若 Worker 在 cancel 到达前已提交 `complete`，则以 **先到达的提交** 为准（实现上可用「世代号 / processing_token」保证 cancel 不会误伤下一单，若 Bot 被复用则不复用，直接销毁 goroutine 更简单）。
4. **销毁 Bot**：从 `bots` 集合移除；其余 Bot **立即**可继续从 PENDING 取单（满足 README「减的是最新一台」时，其它 Bot 行为不变）。
5. **一致性说明**：此语义下 **不存在**「半单完成」对外可见状态；用户可见为 **PENDING 中该单重新出现**（PROCESSING 区移除）。

---

## 7. 并发模型：双通道 + 多 Worker

### 7.1 架构意象

- **逻辑上**两条 FIFO：**vipCh**、**normalCh**（可用 `chan OrderID` 或「mutex + slice」模拟；**不推荐**无界缓冲 `chan` 堆积全部历史单，应用 **「调度器串行出队 + Worker 池」**：调度器从 VIP/Normal 结构原子地取出下一个 `OrderID`，再投递给空闲 Bot）。
- **推荐实现**：`Dispatcher` 持有一个 `sync.Mutex` 保护的 **双队列**；多个 Bot 调用 `AcquireNext(ctx)`：
  - 内部：**先 peek VIP，非空则 pop**；否则 pop Normal。
  - 保证 **创建订单** 与 **出队** 互斥，避免丢单/双取。

### 7.2 订单创建与消费的竞态

| 场景 | 策略 |
|------|------|
| 并发 `POST /orders` | `NextOrderID` 使用 `atomic.Uint64` 或 mutex；入队与 ID 分配在同一把锁内完成。 |
| 多 Bot 同时抢下一单 | **单飞**：只有 `Dispatcher.Dequeue()` 一处从双队列弹出；弹出后立即把订单标 `processing` 并写 `assigned_bot_id`，再返回给调用方 Bot。 |
| Snapshot 与写冲突 | `Snapshot()` 在 mutex 下复制 slice / map 到只读 DTO；持锁时间尽量短。 |

### 7.3 Worker（Bot）循环（伪代码）

```text
ctx := botCtx // 可被 RemoveBot 取消
loop until bot.removed:
  order := dispatcher.AcquireNext(ctx, bot.id)
  if ctx.Err() != nil: return
  cookCtx, cancelCook := context.WithCancel(ctx)
  go RemoveBot 时: cancelCook()  // 中断 10s
  select:
    case <-after10s: mark complete(cookCtx 仍有效时)
    case <-cookCtx.Done(): requeue to pending at saved tier+index; return or continue per 生命周期
  on 内部错误: mark exception
```

---

## 8. 分阶段开发计划（每阶段结束具备可执行测试）

各阶段 **相互独立可合并**，但建议按序降低返工。

| 阶段 | 交付物 | 测试用例（必须） |
|------|--------|------------------|
| **P1 Domain** | 状态机、Tier 插队规则纯函数 | 表驱动单测：新 VIP 在已有 VIP 后、在所有 Normal 前；单号递增规则。 |
| **P2 Repo 内存** | `Enqueue`/`Dequeue`/列表 | 单测：并发 N 次 `Create` + 顺序 `Dequeue` 符合 VIP 优先；无死锁。 |
| **P3 Dispatcher + 单 Bot** | 一个 Worker + 假 Clock | 集成测：入队 → 10s（假 0ms）→ complete；`result` 日志格式可选 mock。 |
| **P4 多 Bot 并发** | N 个 Worker | `-race` 下 `go test`；多单完成顺序符合队列；无重复取单。 |
| **P5 Service + EXCEPTION** | 注入错误 → `exception` 状态 | 断言订单仍在 repo、不在 pending 队列；可选 `retry` 回队。 |
| **P6 HTTP API** | `httptest` 覆盖全部路由 | 集成测：`POST /orders`、`GET snapshot`、`POST/DELETE /bots`。 |
| **P7 前端** | `web/`：Vite + TypeScript + React | `npm run build`；可选 Playwright；CI 可选仅前端 build。 |
| **P8 CLI + scripts** | `scripts/test.sh` / `build.sh` / `run.sh` | CI 现有 workflow 全绿；`result.txt` 含 `HH:MM:SS`。 |
| **P9 部署** | `deploy.sh` | 本地 `bash -n deploy.sh`；上 EC2 一次冒烟。 |

**每阶段完成定义**：对应包 `go test ./...` 通过；P6 起增加 `internal/...` 子包覆盖率门槛可按需设定。

---

## 9. 目录结构建议

```text
cmd/
  server/          # HTTP + embed 前端
  orderctl/        # CLI：--demo 写 stdout（run.sh 重定向 result.txt）
internal/
  api/             # chi/echo/gin 路由、DTO、handler
  service/         # KitchenService 实现
  worker/          # Bot loop、Dispatcher
  repository/
    memory/        # 内存 OrderRepo、BotRepo
  domain/          # 模型、状态机、错误码
  clock/           # 抽象时间（测试注入）
web/               # Vite + TypeScript + React（`npm run build`，产物 embed 或 rsync）
scripts/
  test.sh build.sh run.sh
deploy.sh
```

---

## 10. AWS EC2 部署脚本（`deploy.sh`）

- 参考 [dota2-replayer/deploy.sh](../dota2-replayer/deploy.sh)：本地 **交叉编译 Linux amd64**、`rsync` 同步、`ssh` 远程执行。
- **部署前**可执行：`docker stop dota2-web || true`（与 dota2-replayer 一致，即暂停 dota2master 站点容器），避免端口或资源争用；部署完成是否恢复 dota2 由你手动决定。
- 本服务可用 **`nohup ./server :8080`** 或独立 `Dockerfile` + `docker run -p 8080:8080`；脚本内用占位变量 `EC2_HOST`、`REMOTE_DIR` 便于修改。

具体命令见仓库根目录 [deploy.sh](./deploy.sh)。

---

## 11. 验收映射（README → 本方案）

| README | 实现要点 |
|--------|-----------|
| 1–2 PENDING 与 VIP 插队 | 双队列 + Snapshot `pending` 分区展示 |
| 3 单号递增 | `atomic` / mutex 生成器 |
| 4 +Bot、10s、COMPLETE | Worker + Clock；完成后写日志 |
| 5 无单 Idle | `AcquireNext` 阻塞在 cond 或 channel |
| 6 -Bot 最新、处理中回队 | LIFO 选 Bot；**cancel** 中断 10s；`RequeueToPending` 恢复原 VIP/Normal 位置 |
| 7 无持久化 | 内存 Repo |
| CI result.txt | CLI `--demo` 共享 Service，打印带时间戳行 |

---

## 12. 小结

采用 **自上而下：HTTP API → KitchenService → Memory Repository + Domain**，运行时以 **互斥保护的双队列（VIP/Normal）+ 多 Bot Worker 串行出队** 为核心，处理 **建单/抢单竞态**；**`-Bot` 立即取消烹饪并将订单退回 PENDING**（与 README 一致）；**EXCEPTION** 承接不可恢复错误且不丢单；前端固定 **Vite + TypeScript + React**；**分阶段测试** 控制复杂度；**deploy.sh** 支持在 EC2 上暂停 `dota2-web` 后发布本服务。
