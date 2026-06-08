# 麦当劳自动化订单管理系统 — 技术设计文档

> 版本:v1.0 ｜ 日期:2026-06-01 ｜ 作者:候选人
> 对应作业:FeedMe SE Take Home Assignment(前端为主 + Node.js 后端)

---

## 1. 目标与原则

构建一个基于优先级队列 + 机器人(Bot)并发处理的自动化订单管理系统。

**核心设计原则(贯穿全文):**

1. **以模型为中心(Model-Centric / Class)** —— 业务规则全部内聚在领域模型(Class)中,不散落在控制器或组件里。
2. **解耦 + 高内聚** —— 领域核心与框架、网络、UI 完全隔离;每个单元单一职责。
3. **清晰分层** —— Domain → Application → Interface → Infrastructure。
4. **代码质量第一** —— TypeScript strict、ESLint、Prettier、commit 规范、可读性优先。
5. **可测试** —— 领域核心可用虚拟时钟做确定性单测,把 10 秒瞬时推进。
6. **一份逻辑、多处复用** —— 同一领域核心被「后端服务」「CLI(生成 result.txt)」「测试」共用,零重复。

---

## 2. 需求映射(User Story → 设计落点)

| #   | 需求                                   | 设计落点                                                                     |
| --- | -------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | 普通订单进入 PENDING                   | `Kitchen.createOrder(NORMAL)` → `OrderQueue.enqueue`                         |
| 2   | VIP 订单排在普通订单前、已有 VIP 后    | `OrderQueue` 优先级:VIP 段 + NORMAL 段,各自 FIFO                             |
| 3   | 订单号唯一且递增                       | `Kitchen` 内单调自增序列发号                                                 |
| 4   | Bot 处理 10s → COMPLETE → 取下一单     | `Bot` + `Clock` 计时;完成后触发再调度                                        |
| 5   | 队列空时 Bot 进入 IDLE 等待            | `Kitchen.dispatch()` 找不到订单则 Bot 置 IDLE                                |
| 6   | 删 Bot 取最新;处理中订单退回保持优先级 | `Kitchen.removeBot()` 弹出最新 Bot,正在处理的订单 `requeue` 回原优先级段头部 |
| 7   | 无持久化,纯内存                        | 全部状态在内存对象图中,无 DB                                                 |

---

## 3. 技术选型

| 维度 | 选型                                         | 理由                             |
| ---- | -------------------------------------------- | -------------------------------- |
| 语言 | TypeScript(strict)                           | 类型安全、即文档、前后端共享类型 |
| 仓库 | pnpm workspaces monorepo                     | 核心逻辑一处编写,三处复用        |
| 后端 | Fastify + `ws`(原生 WebSocket)               | 轻量高性能,WS 实时推送状态       |
| 前端 | React 18 + Vite + Zustand + TailwindCSS      | 构建快、状态管理轻、UI 可定制    |
| 测试 | Vitest + React Testing Library               | 全栈统一,支持虚拟时钟            |
| 质量 | ESLint + Prettier + TS strict + Husky        | 提交前强制门槛                   |
| 部署 | 宝塔面板(HTML 项目 + Node 项目 + Nginx 反代) | 贴合现有阿里云环境,无需 Docker   |

---

## 4. Monorepo 结构

```
se-take-home-assignment/
├── package.json                # 根:workspaces + 公共脚本
├── pnpm-workspace.yaml
├── tsconfig.base.json          # 共享 TS 配置
├── .eslintrc.cjs / .prettierrc
├── packages/
│   └── core/                   # ★ 领域核心(框架无关,纯 TS)
│       ├── src/
│       │   ├── models/
│       │   │   ├── Order.ts
│       │   │   └── Bot.ts
│       │   ├── services/
│       │   │   ├── OrderQueue.ts
│       │   │   └── Kitchen.ts        # 聚合根 / 调度中枢
│       │   ├── events/
│       │   │   └── DomainEvent.ts    # 领域事件定义 + EventEmitter
│       │   ├── clock/
│       │   │   ├── Clock.ts          # 接口
│       │   │   ├── RealClock.ts
│       │   │   └── FakeClock.ts      # 测试用
│       │   ├── types.ts              # OrderType / OrderStatus / BotStatus 枚举
│       │   └── index.ts             # 对外导出
│       └── tests/                    # 领域单测(重点覆盖)
├── apps/
│   ├── server/                 # 后端服务:包装 core
│   │   ├── src/
│   │   │   ├── application/          # 用例编排(KitchenService)
│   │   │   ├── interface/
│   │   │   │   ├── http/             # REST 路由(命令)
│   │   │   │   └── ws/               # WS gateway(状态推送)
│   │   │   ├── infrastructure/       # config / logger
│   │   │   └── main.ts
│   │   └── tests/
│   ├── web/                    # React 前端
│   │   ├── src/
│   │   │   ├── components/           # 纯展示组件
│   │   │   ├── features/             # 业务区块(OrderBoard / BotPanel / ControlBar)
│   │   │   ├── hooks/                # useWebSocket 等
│   │   │   ├── services/             # ws/rest 客户端
│   │   │   ├── store/                # Zustand store
│   │   │   ├── types/                # 复用 core 的协议类型
│   │   │   └── App.tsx
│   │   └── tests/
│   └── cli/                    # 命令行:复用 core → result.txt
│       └── src/main.ts
├── scripts/                    # CI 对接(已存在)
│   ├── build.sh / test.sh / run.sh
│   └── result.txt
└── docs/
    ├── specs/                  # 本设计文档
    └── PROGRESS.md             # 开发进度跟踪
```

**复用关系:** `packages/core` 被 `server`、`cli`、各自 `tests` 引用。前端通过协议类型与 core 对齐(不直接跑 core,逻辑在后端权威)。

---

## 5. 领域模型设计(核心)

### 5.1 类型定义(`types.ts`)

```ts
export enum OrderType {
  NORMAL = 'NORMAL',
  VIP = 'VIP',
}
export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
}
export enum BotStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
}
```

### 5.2 `Order`(实体)

- 字段:`id`(唯一递增)、`type`、`status`、`createdAt`、`completedAt?`
- 行为:`markProcessing()` / `markPending()` / `markComplete()` —— 状态迁移内聚于实体,外部不可随意改 status。
- VIP 优先级由 `type` 表达,排序逻辑归 `OrderQueue` 负责(职责分离)。

### 5.3 `Bot`(实体)

- 字段:`id`、`status`、`currentOrder: Order | null`、内部计时句柄。
- 行为:`assign(order)` 开始处理、`finish()` 完成、`abort(): Order | null` 中断并返回被中断订单(供退回)。
- Bot **不直接操作队列**,只管自身状态 + 计时;调度由 Kitchen 决定。

### 5.4 `OrderQueue`(优先级队列)

- 内部两段:`vipQueue: Order[]` 与 `normalQueue: Order[]`,均 FIFO。
- `enqueue(order)`:按 type 进对应段尾。
- `dequeue(): Order | null`:VIP 段非空优先取,否则取 NORMAL 段。
- `requeue(order)`:退回时插入对应段**头部**(保持其原有优先位置,满足需求 6)。
- `snapshot()`:返回当前等待列表(用于推送/渲染)。

### 5.5 `Kitchen`(聚合根 / 调度中枢)

系统唯一对外入口,持有 `OrderQueue` + `Bot[]` + `Clock` + `EventEmitter`。

**命令方法:**

- `createOrder(type): Order` —— 发号(单调递增)、入队、发 `OrderCreated`、触发 `dispatch()`。
- `addBot(): Bot` —— 新建 Bot 入列、发 `BotAdded`、触发 `dispatch()`。
- `removeBot(): void` —— 弹出**最新**(数组尾)Bot;若其处理中,`abort()` 得到订单并 `requeue` 回原优先级、订单状态回 PENDING;发 `BotRemoved`。

**内部调度 `dispatch()`:**

- 遍历 IDLE Bot,从队列 `dequeue` 分配;订单置 PROCESSING、发 `OrderPickedUp`;通过 `Clock.setTimeout(10s)` 安排完成。
- 完成回调:订单置 COMPLETE、发 `OrderCompleted`、Bot 置 IDLE、再次 `dispatch()`。
- 队列空 → IDLE Bot 保持等待(需求 5)。

**为什么是聚合根:** 所有状态变更必须经 Kitchen,保证不变量(唯一性、优先级、计时一致),外部只发命令、收事件。

### 5.6 `Clock`(时间抽象 —— 可测试性关键)

```ts
interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): CancelHandle;
}
```

- `RealClock`:封装真实 `setTimeout`(生产用,真 10s)。
- `FakeClock`:手动 `advance(ms)` 推进虚拟时间并同步触发到期回调 —— 单测中瞬时验证 10s 行为,确定、无 flaky。

### 5.7 领域事件(解耦渲染)

```
OrderCreated | OrderPickedUp | OrderCompleted | OrderRequeued | BotAdded | BotRemoved
```

事件携带时间戳 + 载荷。**同一事件流,两种消费者:**

- `server` → 转 WS 消息推给前端。
- `cli` → 转 `result.txt` 日志行(带 HH:MM:SS,满足 CI)。

---

## 6. 分层架构

```
┌─────────────────────────────────────────────┐
│ Interface 层   HTTP 路由 / WS gateway          │ 仅协议转换,无业务规则
├─────────────────────────────────────────────┤
│ Application 层 KitchenService(用例编排)        │ 接命令、订阅事件、广播
├─────────────────────────────────────────────┤
│ Domain 层      packages/core(Kitchen 等)      │ 全部业务规则,纯逻辑、可单测
├─────────────────────────────────────────────┤
│ Infrastructure config / logger / clock 实现     │ 技术细节
└─────────────────────────────────────────────┘
```

依赖方向自上而下,Domain 不依赖任何上层 —— 依赖倒置。

---

## 7. 通信协议(WebSocket 为主 + REST 命令)

**REST(命令,幂等触发):**

- `POST /api/orders` body `{ type: 'NORMAL' | 'VIP' }`
- `POST /api/bots`(增加 bot)
- `DELETE /api/bots`(删除最新 bot)
- `GET /api/state`(首次拉取全量快照)

**WebSocket(状态推送):** 连接后 server 先推全量 `state` 快照,之后每次领域事件推增量/全量:

```jsonc
// server → client
{ "type": "STATE", "payload": { "pending": [...], "processing": [...], "complete": [...], "bots": [...] } }
{ "type": "EVENT", "payload": { "kind": "OrderCompleted", "ts": "14:32:13", "orderId": 1002 } }
```

> 命令也可走 WS,但用 REST 触发 + WS 单向推送,职责更清晰、易测。

Nginx 反代需放行 WS 升级头(见部署章节)。

---

## 8. 前端架构与 UI 方向

**分层:** components(纯展示)/ features(业务区块)/ hooks(useWebSocket)/ services(ws+rest 客户端)/ store(Zustand)/ types。

**状态流:** WS 推送 → service 解析 → 写入 Zustand store → 组件订阅渲染。组件不含业务规则,只渲染 + 发命令。

**核心界面区块:**

- 顶部 `ControlBar`:New Normal / New VIP / + Bot / − Bot 四个操作按钮 + 计数指标。
- `OrderBoard`:PENDING / PROCESSING / COMPLETE 三列看板;VIP 订单高亮标记;卡片含订单号、类型、状态、计时进度。
- `BotPanel`:Bot 列表,显示 IDLE/PROCESSING 及当前处理订单 + 剩余倒计时。
- 处理中卡片显示 10s 进度条(前端用 createdAt/预计完成时间插值,纯展示)。

**UI 品质要求(开发时用 frontend-design skill):** 现代、精致、有麦当劳品牌氛围(红黄色系点缀但不刺眼),清晰层级、动效过渡(订单流转、进度条),响应式。避免通用 AI 风格。

---

## 9. 测试策略

| 层         | 工具               | 重点                                                                                             |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| core(重点) | Vitest + FakeClock | 全部 user story:优先级、并发多 Bot、删 Bot 退回、唯一递增 id、队列空 IDLE。瞬时推进 10s,确定性。 |
| server     | Vitest             | 命令 → 状态 → 事件广播的集成验证                                                                 |
| web        | Vitest + RTL       | store reducer、关键组件渲染、ws 消息处理                                                         |

覆盖率门槛纳入 CI(core 目标 ≥ 90%)。

---

## 10. 开发规范(Skills / 工程约定)

1. **TypeScript strict**:禁 `any`(必要处显式 `unknown` + 收窄);开 `noUncheckedIndexedAccess`。
2. **命名**:类 `PascalCase`、变量/函数 `camelCase`、常量 `UPPER_SNAKE`、文件与默认导出同名。
3. **单一职责**:一个文件一个主要导出;文件过长即拆分。
4. **不可变优先**:领域状态变更走方法,不外部直接改字段(字段 `private` + 受控暴露)。
5. **ESLint + Prettier**:统一风格,CI 校验。
6. **提交规范(Conventional Commits)**:`feat: / fix: / test: / docs: / chore: / refactor:`;每个提交聚焦一件事。
7. **Husky pre-commit**:lint + typecheck + 相关单测。
8. **测试先行**:领域逻辑按 TDD —— 先写失败测试,再实现。
9. **注释**:解释「为什么」,不复述「做什么」;公共 API 加简要 JSDoc。
10. **依赖方向**:严禁 Domain 反向依赖框架/IO。

---

## 11. 部署方案(宝塔面板 / 阿里云)

服务器:`116.62.13.104`,宝塔面板。域名:`demo.magicyyds.com`(前端)、`api.demo.magicyyds.com`(后端)。

**前端(demo.magicyyds.com — HTML 项目):**

1. 本地 `pnpm --filter web build` 产出 `apps/web/dist`。
2. 上传 `dist` 到 `/www/wwwroot/demo.magicyyds.com`。
3. 宝塔 HTML 项目伺服;SPA 需配置 fallback 到 `index.html`。
4. 前端环境变量指向 `wss://api.demo.magicyyds.com`。

**后端(api.demo.magicyyds.com — Node 项目):**

1. `pnpm --filter server build` 产出 `apps/server/dist`。
2. 宝塔「Node 项目」加载,PM2 守护,监听本地端口(如 `3001`)。
3. 宝塔为 `api.demo.magicyyds.com` 配反向代理 → `127.0.0.1:3001`,**加 WebSocket 升级头**:
   ```nginx
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   proxy_set_header Host $host;
   ```
4. 两个域名都建议在宝塔申请 SSL(HTTPS / WSS),避免 h5 的 https 页面连 ws 被浏览器拦截。

**CI(result.txt)无需服务器**:GitHub Actions 跑 `scripts/run.sh` → 调 `cli` → 输出带时间戳的 `scripts/result.txt`,保持流水线绿色。

---

## 12. CI 对接

现有 `.github/workflows/backend-verify-result.yaml` 要求:`build.sh`/`test.sh`/`run.sh` 可执行,`scripts/result.txt` 非空且含 `HH:MM:SS`。

- `build.sh` → `pnpm install && pnpm -r build`
- `test.sh` → `pnpm -r test`
- `run.sh` → `node apps/cli/dist/main.js > scripts/result.txt`(cli 跑预设场景,复用 core,日志含时间戳)

---

## 13. 开发里程碑(进度见 docs/PROGRESS.md)

1. M1 工程脚手架:monorepo、TS、lint、CI 脚本接通(空实现先让 CI 绿)。
2. M2 领域核心 + 单测:Order/Bot/OrderQueue/Kitchen/Clock + 全 user story 测试(TDD)。
3. M3 CLI:复用 core 产出 result.txt。
4. M4 后端服务:REST + WS,事件广播。
5. M5 前端:看板 UI(frontend-design skill)+ WS 联调。
6. M6 打磨:覆盖率、文档、部署脚本、宝塔上线。

---

## 14. 关键设计取舍

- **后端权威 + 前端薄客户端**:单一真相来源,避免前后端逻辑漂移;代价是前端需联网(本作业可接受)。
- **REST 触发 + WS 单向推送**:比双向命令更易测、职责更清。
- **Clock 抽象**:为可测试性付出小抽象成本,换来确定性快测,值得。
- **monorepo**:换来零逻辑重复 + 类型共享,初始脚手架成本一次性。
