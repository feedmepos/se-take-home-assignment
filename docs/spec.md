# McDonald's Order Controller — 技术方案设计

> 面试题:FeedMe Software Engineer Take Home Assignment
> 技术栈:Vue 3 + Vite + TypeScript + Pinia + Element Plus
> 目标:1 小时内完成,clean code 优先,不过度设计

---

## 1. 需求还原

### 1.1 实体

- **Order**:订单,有唯一自增 `id`、类型(`NORMAL` / `VIP`)、状态(`PENDING` / `PROCESSING` / `COMPLETE`)、创建时间戳、(可选)被分配的 botId、完成时间戳。
- **Bot**:烹饪机器人,有唯一自增 `id`、状态(`IDLE` / `BUSY`)、当前处理的 orderId、开始处理的时间戳 `startedAt`(用于进度条)。timer handle 不挂在 Bot 上,见 §3。

### 1.2 核心规则

| # | 规则 | 设计要点 |
|---|---|---|
| R1 | New Normal Order → 入 PENDING 队尾 | 调用统一的 `insertByPriority` |
| R2 | New VIP Order → 排在所有 VIP 之后、所有 Normal 之前 | 调用统一的 `insertByPriority`(同 type 组内按 id 升序) |
| R3 | 订单号全局唯一自增 | store 内单调计数器,不复用 |
| R4 | + Bot → 立即抢 PENDING 队首,10s 后完成 | 创建即触发派单 |
| R5 | PENDING 空 → Bot IDLE | 完成后再次派单,无单则 IDLE |
| R6 | - Bot → 销毁**最新** bot,若在处理则订单**原位归还** PENDING(保持优先级) | LIFO 销毁 + `clearTimeout` + 调用同一个 `insertByPriority`(凭 id 自动恢复原位) + 归还后 `dispatch()` 让空闲 bot 接单 |
| R7 | 无持久化 | 内存即可,Pinia store |

### 1.3 隐含边界

- 多个 Bot 并发抢单时,**单线程 JS 不存在真正的竞争**,但派单逻辑要保证「一个订单只被一个 Bot 拾起」。
- 订单原位归还:**不能简单 `unshift` 或 `push`**。最稳定的「原位」定义是「同 type 组内按 order id 升序」——id 越小代表越早创建,本应越靠前。新建订单(id 最大)和归还订单(id 较小)共用同一个插入函数,语义统一。
- 增减 Bot 是「事件驱动」:增加 → 触发一次派单尝试;减少 → 归还订单后**同样要触发一次派单尝试**——可能存在更早就空闲下来的 bot 正在等单(详见 §4.3 的反例与证明)。

---

## 2. 架构分层(遵循 AGENTS.md)

```
┌─────────────────────────────────────────┐
│  UI 层  src/views/Home.vue              │  ← 只负责渲染 & 事件转发
│  - PENDING 列表 / COMPLETE 列表          │
│  - Bot 列表 (显示状态 + 进度)            │
│  - 4 个按钮: +Normal +VIP +Bot -Bot     │
└──────────────────┬──────────────────────┘
                   │ 调用 action
┌──────────────────▼──────────────────────┐
│  业务逻辑层  src/store/order.ts (Pinia) │  ← 状态 + 派单调度
│  - state: orders, pending, bots,        │
│           nextOrderId, nextBotId        │
│  - computed: completed                  │
│  - actions: addNormal/addVip/           │
│             addBot/removeBot/           │
│             dispatch/finishOrder        │
│  - module-private: ordersById, timers   │
│                    (非响应式 Map)        │
└──────────────────┬──────────────────────┘
                   │ 调用纯函数
┌──────────────────▼──────────────────────┐
│  数据访问/工具层  src/utils/queue.ts    │  ← 纯函数,易测
│  - insertByPriority(list, order)        │
│    (同时处理 R2 新建 VIP 和 R6 归还订单) │
└─────────────────────────────────────────┘
```

> 题目无需后端,`src/api/` 暂不使用;若面试官追问"为什么不用 api 层",答:无远程数据源,内存模型直接进 store,**避免过度设计**。

---

## 3. 数据模型(TypeScript)

```ts
// src/store/types.ts
export type OrderType = 'NORMAL' | 'VIP'
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'

export interface Order {
  id: number
  type: OrderType
  status: OrderStatus
  createdAt: number       // Date.now(),用于 HH:MM:SS 展示
  completedAt?: number
  botId?: number          // 被哪个 bot 处理
}

export type BotStatus = 'IDLE' | 'BUSY'

export interface Bot {
  id: number
  status: BotStatus
  orderId?: number
  startedAt?: number      // 开始处理订单的时间戳,用于进度条计算
}
```

### State 设计(Pinia store 内部)

```ts
// state (响应式)
const orders   = ref<Order[]>([])     // 所有订单的单一数据源(SSOT)
const pending  = ref<Order[]>([])     // 派单队列,元素是 orders 中订单的引用
const bots     = ref<Bot[]>([])
const nextOrderId = ref(1)
const nextBotId   = ref(1)

// 派生(无需额外存储,避免双写)
const completed = computed(() =>
  orders.value.filter(o => o.status === 'COMPLETE')
)

// 非响应式辅助容器(不放进 ref/reactive,避免不必要的依赖追踪)
const ordersById = new Map<number, Order>()
const timers     = new Map<number, ReturnType<typeof setTimeout>>()  // botId -> timer
```

> **设计要点**:
> - `orders` 是单一数据源,`pending` / `completed` 只是它在不同状态下的视图
> - `completed` 用 `computed` 派生,避免 push 时漏同步
> - `ordersById` 和 `timers` 是 Map,不需要响应式追踪,**声明在 `defineStore` 的 setup 工厂函数内部**(与 `orders` 等 ref 同级),而非模块顶层。放在模块顶层会被所有 store 实例共享,导致 `setActivePinia(createPinia())` 重建 store 后 Map 仍残留上次的数据,破坏 R7 的内存隔离与单测隔离
> - timer handle **绝不**挂到 `bot` 对象上,否则 Pinia 会响应式包裹它,影响性能且容易内存泄漏

---

## 4. 核心算法

### 4.0 下单 — `addNormal` / `addVip`

```ts
function addOrder(type: OrderType): void {
  const order: Order = {
    id: nextOrderId.value++,
    type,
    status: 'PENDING',
    createdAt: Date.now()
  }
  orders.value.push(order)              // 进 SSOT
  ordersById.set(order.id, order)       // 进索引
  insertByPriority(pending.value, order) // 进派单队列(R1 / R2)
  dispatch()                            // 若有 IDLE bot 立即接单
}

const addNormal = () => addOrder('NORMAL')
const addVip    = () => addOrder('VIP')
```

> 对应 README Requirements R1、R2、R3。`nextOrderId` 是 `ref`,**自增必须用 `.value++`** —— TS 不会报错(它是个数字),但忘了 `.value` 会导致响应式失效或 NaN。

### 4.1 统一的优先级插入 — `insertByPriority`

**关键洞察**:新建订单(id 永远最大)和归还订单(id 较小)用同一个函数处理,原位归还问题自然消失。

```ts
export function insertByPriority(pending: Order[], order: Order): void {
  // 找到第一个「应该排在 order 之后」的位置
  const insertAt = pending.findIndex(o => {
    // VIP 必须排在所有 Normal 之前
    if (order.type === 'VIP' && o.type === 'NORMAL') return true
    if (order.type === 'NORMAL' && o.type === 'VIP') return false
    // 同 type:id 小的在前(归还时 id 较小,自动恢复原位)
    return o.id > order.id
  })
  pending.splice(insertAt === -1 ? pending.length : insertAt, 0, order)
}
```

> **边界穷举**:
> - 队列空 → `findIndex` 返回 -1 → `splice(0, 0, o)` → 插入首位 ✓
> - **新建 VIP**(id 最大) `[V1, V2, N3]` + V5 → V1/V2 同 type id<5 跳过,N3 type 异 且 V 优先 → 插到 N3 前 `[V1, V2, V5, N3]` ✓
> - **新建 Normal** `[V1, V2, N3]` + N5 → V1/V2 type=VIP 跳过,N3 同 type id=3<5 跳过 → 末尾 `[V1, V2, N3, N5]` ✓
> - **归还 VIP** V1 当前 `[V2, V3, N4]` → V2 同 type id=2>1 → 插到 V2 前 `[V1, V2, V3, N4]` ✓ **(修复原 bug)**
> - **归还 Normal** N1 当前 `[V2, N3]` → V2 type=VIP 跳过,N3 id=3>1 → 插到 N3 前 `[V2, N1, N3]` ✓

### 4.2 派单 — `dispatch`

```ts
// 每次状态变化(新订单 / Bot 完成 / +Bot)后调用,幂等
function dispatch(): void {
  for (const bot of bots.value) {
    if (bot.status !== 'IDLE') continue
    const next = pending.value.shift()
    if (!next) return                 // 没单了,后续 IDLE bot 也不用看
    next.status = 'PROCESSING'
    next.botId = bot.id
    bot.status = 'BUSY'
    bot.orderId = next.id
    bot.startedAt = Date.now()
    const timerId = setTimeout(() => finishOrder(bot.id), 10_000)
    timers.set(bot.id, timerId)
  }
}
```

### 4.3 销毁最新 Bot — `removeBot`

```ts
function removeBot(): void {
  const bot = bots.value.pop()        // LIFO,移除最新创建的
  if (!bot) return
  if (bot.status === 'BUSY' && bot.orderId != null) {
    clearTimeout(timers.get(bot.id))
    timers.delete(bot.id)
    const order = ordersById.get(bot.orderId)!
    order.status = 'PENDING'
    order.botId = undefined
    // 关键:用统一的 insertByPriority,凭 order.id 自动恢复原位
    insertByPriority(pending.value, order)
    dispatch()  // 可能存在更早空闲的 bot 在等单,必须再派一次
  }
}
```

> **决策**:订单归还和新建订单共用 `insertByPriority`。订单的 id 是创建时间的代理,id 升序 = 创建顺序 = 原始位置顺序。无需额外记录 index,无需区分新建/归还路径,代码更紧凑。
>
> **为什么归还后必须 `dispatch()`(推翻早期「无需派单」的错误结论)**:早期方案曾断言「如果最新 bot 是 BUSY,那么所有更老的 bot 也必然 BUSY,所以归还后系统里不存在 IDLE bot,无需 `dispatch`」。**这个不变量是错的**,反例:
>
> 1. `+Bot`(bot#1),`+Normal`(N1) → bot#1 在 t=0 开始处理 N1;
> 2. t=3s 时 `+Bot`(bot#2)、`+Normal`(N2) → bot#2 在 t=3s 开始处理 N2;
> 3. t=10s 时 bot#1 完成 N1,PENDING 此刻为空 → **bot#1 转为 IDLE**,而 bot#2(t=3s 起算)要到 t=13s 才完成,仍是 BUSY;
> 4. 此时「最新的 bot#2 是 BUSY,但更老的 bot#1 是 IDLE」——不变量被打破。
>
> 此时 `-Bot` 销毁最新的 bot#2,N2 归还 PENDING。若不 `dispatch`,空闲的 bot#1 会一直干等,N2 永远卡在 PENDING——**直接违反 R4/R5**(有 PENDING 订单时 IDLE bot 必须立刻接单)。
>
> 因此归还后**必须**调用 `dispatch()`。它是幂等的:常见情形(所有 bot 都 BUSY)下 `dispatch` 是无害的空操作;存在更老 IDLE bot 时它才真正派单。
>
> **关于 R6「the processing order should remain un-process」的正确解读**:这句指的是「被中断的订单不能被当作已完成、不能跳进 COMPLETE」,即把它**退回 PENDING 重新排队**;它并不意味着「禁止任何其它 bot 再处理它」。被销毁 bot 自己的处理过程确实停止了(`clearTimeout`),订单回到 PENDING 后,按 R4/R5 本就该被任何空闲 bot 接走。把「un-process」误读成「禁止再被接单」会与 R4/R5 自相矛盾。

### 4.4 + Bot

```ts
function addBot(): void {
  bots.value.push({ id: nextBotId.value++, status: 'IDLE' })
  dispatch()                          // 新 bot 立即抢单
}
```

### 4.5 完成订单

```ts
function finishOrder(botId: number): void {
  const bot = bots.value.find(b => b.id === botId)
  if (!bot || bot.orderId == null) return  // bot 已被销毁,无操作
  const order = ordersById.get(bot.orderId)!
  order.status = 'COMPLETE'
  order.completedAt = Date.now()
  // 不需要手动 push 到 completed —— completed 是 computed,会自动响应
  bot.status = 'IDLE'
  bot.orderId = undefined
  bot.startedAt = undefined
  timers.delete(bot.id)
  dispatch()                          // 看看有没有下一单
}
```

---

## 5. UI 设计(Home.vue)

```
┌──────────────────────────────────────────────────────────┐
│  McDonald's Order Controller                              │
├──────────────────────────────────────────────────────────┤
│  [+ Normal Order]  [+ VIP Order]   [+ Bot]   [- Bot]     │
├──────────────────────────────────────────────────────────┤
│  PENDING (n)         │  COMPLETE (n)                     │
│  ┌────────────────┐  │  ┌────────────────┐               │
│  │ #5  VIP        │  │  │ #1  Normal     │               │
│  │ #6  VIP        │  │  │ #2  VIP        │               │
│  │ #3  Normal     │  │  │ ...            │               │
│  └────────────────┘  │  └────────────────┘               │
├──────────────────────────────────────────────────────────┤
│  BOTS (n)                                                │
│  Bot#1 [BUSY] order#3 ████░░░░░░ 4.2s / 10s              │
│  Bot#2 [IDLE]                                            │
└──────────────────────────────────────────────────────────┘
```

- 用 `el-button` / `el-card` / `el-tag` / `el-progress`
- 进度条:Home.vue 在 `onMounted` 启动一个全局 `setInterval(100ms)` 更新本地 `now` 时间戳,根据 `now - bot.startedAt` 计算 BUSY bot 的进度;`onUnmounted` 中 `clearInterval` 清理。全局只一个 timer,所有 BUSY bot 共用。
- COMPLETE 列表:展示 `formatHHMMSS(order.completedAt)`,呼应 README 时间戳要求(后端选项硬性要求,前端展示是加分项)
- VIP 标签用 `el-tag type="warning"`,Normal 用 `info`

---

## 6. 项目结构(增量)

```
src/
├── App.vue                  (已存在,无改动)
├── main.ts                  (已存在,无改动)
├── router.ts                (已存在,无改动)
├── views/
│   └── Home.vue             ← 重写为本应用 UI
├── store/
│   ├── index.ts             (已存在)
│   └── order.ts             ← 新增:订单 & Bot store
├── utils/
│   ├── index.ts             (已存在)
│   ├── queue.ts             ← 新增:insertByPriority 纯函数(R2 + R6 共用)
│   └── time.ts              ← 新增:formatHHMMSS(用于 COMPLETE 列表展示完成时间)
└── api/                     (本作业未使用)
```

---

## 7. 测试策略

> 题目无强制单测,但 clean code 加分。**至少手动验证以下 10 个场景**(可记录到 `docs/test-cases.md`,面试时展示)。

| # | 场景 | 预期 |
|---|---|---|
| 1 | 连续 3 个 Normal | PENDING 队列 `[N1, N2, N3]` |
| 2 | 1 个 Normal 后加 1 VIP | `[V2, N1]` |
| 3 | `[N1, V2, N3]` 后再加 1 VIP | `[V2, V4, N1, N3]` |
| 4 | 1 个 Bot + 1 个 Normal | 10s 后订单进 COMPLETE,Bot 回 IDLE |
| 5 | 2 个 Bot + 3 个 Normal | 前 2 单并行处理,第 3 单等 |
| 6a | Bot 处理 V1,期间新增 V2 V3,然后 -Bot | V1 归位到 VIP 组首位 → `[V1, V2, V3]` |
| 6b | Bot 处理 N1,期间新增 V2 N3,然后 -Bot | N1 归位到 Normal 组首位(VIP 之后)→ `[V2, N1, N3]` |
| 6c | 2 Bot,Bot#1 处理 V1、Bot#2 处理 V2,-Bot 移除 Bot#2 | V2 归位 → `[V2]`;**关键:V2 不会被 Bot#1 立刻接走**(Bot#1 还在处理 V1) |
| 6d | Bot#1 t=0 处理 N1;t=3s 时 +Bot#2 处理 N2;t=10s Bot#1 完成转 IDLE、Bot#2 仍 BUSY;此时 -Bot 移除 Bot#2 | N2 归还后**必须被 IDLE 的 Bot#1 立刻接走**,PENDING 清空(验证 §4.3 归还后的 `dispatch`,这是早期错误不变量的反例) |
| 7 | 0 Bot,连续下单 | 全部停留在 PENDING |
| 8 | 先有 5 单,再 +Bot | Bot 立即抢首单 |
| 9 | 订单号在销毁/归还后**不重置** | id 单调递增 |
| 10 | 减 Bot 时该 Bot 处于 IDLE | 仅销毁,无订单变动 |

可选:为 `utils/queue.ts` 写 vitest 单测(纯函数,易测),覆盖场景 1-3 + 全 VIP / 全 Normal / 空队列。

---

## 8. 实现顺序(建议 ≤ 60 分钟)

| 阶段 | 内容 | 预估 |
|---|---|---|
| 1 | 定义 types,实现 `utils/queue.ts` | 5 min |
| 2 | 实现 `store/order.ts`(state + actions) | 20 min |
| 3 | 重写 `views/Home.vue`(UI + 事件绑定) | 20 min |
| 4 | 手动跑全部场景 + 修 bug | 10 min |
| 5 | `pnpm build` 通过 + 写 README 使用说明 | 5 min |

---

## 9. 不做的事(避免过度设计)

- ❌ 不引入 SQLite / IndexedDB / localStorage 持久化(README 明确不要)
- ❌ 不写 api 层 mock(无远程交互)
- ❌ 不引入 RxJS / 状态机库(setTimeout + Pinia 足够)
- ❌ 不做拖拽排序、动画过渡等"花哨"特性
- ❌ 不做多语言切换、主题切换
- ❌ 不写 e2e(题目不要求,且 1 小时内不划算)

---

## 10. 风险与对策

| 风险 | 对策 |
|---|---|
| `setTimeout` 在标签页失焦时被节流,10s 可能不准 | 题目是 demo,可接受;面试时主动说明 |
| 频繁 dispatch 导致响应式更新过多 | 数据规模小,Pinia 自带批处理,不优化 |
| Bot 被销毁后,残留的 `setTimeout` 仍然触发 `finishOrder` | `clearTimeout(timers.get(botId))` + `finishOrder` 内 `if (!bot \|\| bot.orderId == null)` 双保险 |
| 多个 IDLE bot 同时抢单 | 单线程 JS + 顺序 `shift`,天然安全 |

---

## 11. 验收清单(对照 README §Requirements)

- [ ] R1 New Normal Order 进 PENDING 队尾
- [ ] R2 New VIP Order 排在所有 VIP 之后、所有 Normal 之前
- [ ] R3 订单号唯一自增
- [ ] R4 +Bot 立即处理,10s 后进 COMPLETE,继续下一单
- [ ] R5 PENDING 空 → Bot IDLE
- [ ] R6 -Bot 销毁最新,正在处理的订单原位归还
- [ ] R7 无持久化
- [ ] `pnpm build` 通过
- [ ] UI 可演示全部场景

---

## 12. 部署

README §Frontend 硬性要求:**"compiled, deployed and hosted on any publicly accessible web platform"**。

### 12.1 build 脚本

`package.json` 已确认为纯 Vite 构建:

```json
"build": "vite build"
```

### 12.2 部署平台:Vercel

选择 Vercel:零配置、对 Vite 原生支持、`git push` 自动出公开 URL。

**步骤**:

1. 推送代码到 GitHub fork
2. 登录 [vercel.com](https://vercel.com) → New Project → 选中该仓库
3. Framework Preset 选 **Vite**(默认会自动识别)
4. Build Command 留空(用 `vite build` 默认)、Output Directory `dist`
5. Deploy → 约 1 分钟拿到形如 `https://<repo>.vercel.app` 的公开 URL

### 12.3 提交清单

- [ ] 本地 `pnpm build` 通过,`dist/` 产物可用
- [ ] 推到 GitHub fork
- [ ] Vercel 部署成功,获得公开 URL
- [ ] 在 PR 描述里附上 GitHub 仓库链接 + Vercel 在线 URL
- [ ] (可选) 在 README 顶部加一行 Demo 链接
