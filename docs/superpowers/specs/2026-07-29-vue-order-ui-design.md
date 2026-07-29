# 麦当劳订单控制器 — Vue 前端展示设计规格

**日期：** 2026-07-29  
**范围：** 在现有 Go 订单控制器之上，增加 Vue 3 页面展示订单交互与处理过程  
**方案：** Go HTTP API + 短轮询 + Vue 3/Vite；Go 同源托管静态资源；CLI 保留

## 目标

1. 在前端页面上展示订单从 PENDING → PROCESSING → COMPLETE 的流转
2. 支持作业要求的四个操作：New Normal、New VIP、+ Bot、- Bot
3. 复用已验证的 `internal/controller` 调度逻辑，避免前后端规则分叉
4. 保留现有 CLI / `-demo` / CI 脚本路径不变

## 决策摘要


| 决策点   | 选择                                              |
| ----- | ----------------------------------------------- |
| 架构    | 混合：核心逻辑在 Go，Vue 经 API 操作；CLI 保留                 |
| 状态同步  | 短轮询 `GET /api/state`（约 300ms）                   |
| 前端栈   | Vue 3 + Vite + Composition API（无 UI 组件库）        |
| 部署形态  | Go `-serve` 同时提供 API 与托管 `web/dist`（`embed`）    |
| 页面区域  | PENDING / PROCESSING / COMPLETE 三栏 + Bot 列表 + 四按钮 |
| 事件日志栏 | 不做（后端 CLI 日志仍保留）                                 |
| process-time | 仅服务端 flag，页面不提供调节                         |


## 架构

```
浏览器 (Vue)
    │  GET  /api/state          (轮询)
    │  POST /api/orders/normal
    │  POST /api/orders/vip
    │  POST /api/bots
    │  DELETE /api/bots
    ▼
cmd/order-controller  ── -serve ──► internal/api (HTTP + 静态资源)
    │                                    │
    │                                    ▼
    │                             internal/controller  (现有，复用)
    │
    └── 默认 / -demo ──► internal/cli  (不变，CI 继续用)
```

### 进程入口


| 模式     | 启动方式                                           | 行为                         |
| ------ | ---------------------------------------------- | -------------------------- |
| 交互 CLI | `./bin/order-controller`                       | 现状不变                       |
| Demo/CI | `-demo`                                        | 现状不变，`scripts/run.sh` 不动   |
| Web    | `-serve`（可选 `-addr=:8080`、`-process-time`）     | HTTP：API + 托管前端构建产物        |


模式优先级：若指定 `-serve` 则进入 Web（忽略 `-demo`）；否则若 `-demo` 则跑 demo；否则交互 CLI。

进程内为**单个**内存 `Controller`（无多租户、无持久化），与现有原型一致。`-serve` 下 controller 日志仍可写 stdout（便于调试），前端不消费该日志。

### 目录增量

- `internal/api/` — HTTP handler、JSON DTO、PROCESSING 派生、静态资源服务
- `web/` — Vue 3 + Vite 前端源码
- `cmd/order-controller/main.go` — 增加 `-serve` / `-addr` 分支
- 生产静态资源：用 `embed` 嵌入 `web/dist`。**编译带 `-serve` 的二进制前须先 `npm run build` 生成 `web/dist`**（仓库可提交一份已构建的 `web/dist`，或在 `build.sh` 中增加可选前端构建步骤；CI 现有 backend 脚本可不强制构建前端）。开发时 Vite 将 `/api` proxy 到 Go。

## API 契约

### 统一快照 JSON

```json
{
  "pending":    [{ "id": 1, "type": "VIP", "status": "PENDING" }],
  "processing": [{ "id": 2, "type": "NORMAL", "status": "PROCESSING" }],
  "complete":   [{ "id": 3, "type": "NORMAL", "status": "COMPLETE" }],
  "bots": [
    { "id": 1, "status": "PROCESSING", "currentOrderId": 2 },
    { "id": 2, "status": "IDLE", "currentOrderId": null }
  ]
}
```

### PROCESSING 派生规则

`Controller.Snapshot()` 仍只返回 `Pending` / `Complete` / `Bots`。  
API 层从各 Bot 的 `CurrentOrder` 收集状态为 `PROCESSING` 的订单，填入 `processing`（按 Bot ID 升序）。不修改调度核心。

### 端点


| 方法       | 路径                   | 作用                                      |
| -------- | -------------------- | --------------------------------------- |
| `GET`    | `/api/state`         | 返回快照                                    |
| `POST`   | `/api/orders/normal` | 建普通单，返回更新后快照                            |
| `POST`   | `/api/orders/vip`    | 建 VIP 单，返回更新后快照                         |
| `POST`   | `/api/bots`          | `+bot`，返回快照                             |
| `DELETE` | `/api/bots`          | `-bot`；无 Bot 时 `404` + `{ "error": "..." }`，否则返回快照 |


- 上述写操作均无请求体
- 错误体统一：`{ "error": "..." }`
- 生产同源托管，无需 CORS；开发依赖 Vite proxy

## 前端

### 布局

- 顶部：四个操作按钮（New Normal / New VIP / + Bot / - Bot）
- 中部：PENDING / PROCESSING / COMPLETE 三栏订单列表
- 下部：Bot 列表（ID、状态、当前订单 ID；无订单则为 IDLE）
- 订单卡片显示 `#ID` + `VIP`/`NORMAL`；VIP 用不同强调色区分
- 不做事件日志栏

### 行为

- 进入页面后每 **300ms** 轮询 `GET /api/state`
- 点击按钮立即调用对应 API；成功则用响应快照更新 UI（不必等下一轮轮询）
- `-bot` 且无 Bot：展示错误提示，页面不崩溃
- `process-time` 仅由服务端 `-process-time` 控制；本地演示可用例如 `-process-time=2s`

### 工程

- `web/`：Vue 3 + Vite + Composition API；以一个主视图为主，避免过度拆分
- 开发：`npm run dev` + 另起 `order-controller -serve`；Vite proxy `/api` → `http://localhost:8080`
- 生产：`npm run build` → `web/dist`，由 Go `embed` 同源托管

## 错误处理


| 场景                        | 行为                                      |
| ------------------------- | --------------------------------------- |
| `DELETE /api/bots` 且无 Bot | `404`，`{ "error": "no bots to remove" }`；前端提示 |
| 未知路径 / 方法                 | `404` / `405`                           |
| 前端网络失败                    | 保留上次快照，显示简短错误；轮询继续                    |


不做额外全局 panic 恢复框架；依赖现有 controller 正确性。

## 测试

- 现有 `controller` / `cli` / `order` 单测保持不变
- 新增 `internal/api` HTTP 单测：建单、VIP 顺序体现在 pending、加减 Bot、快照含 `processing`、无 Bot 时删除返回 404
- 前端不做重 E2E；手动验证四按钮与三栏流转

## 明确不在范围

- 数据持久化、多用户会话、鉴权
- WebSocket / SSE、UI 组件库、公网部署
- 改动 `scripts/run.sh` / CI demo 流程（CLI 路径保持绿）
- 页面调节 process-time、事件日志栏

## 交付检查清单

1. `./scripts/test.sh` 仍通过（含 API 单测）
2. 构建前端后，`./bin/order-controller -serve` 可打开页面完成作业全部交互
3. CLI `-demo` / `scripts/result.txt` 行为不变
4. README 补充 Web 启动步骤（`web/` 下 `npm install && npm run build`，再 `-serve`）
