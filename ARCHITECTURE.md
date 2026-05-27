# 架构文档

## 技术栈

React 19 + TypeScript 6 + Vite 8 + Zustand 5 + Tailwind CSS 4 + Vitest 4

## 文件结构

```
src/
├── config.ts            常量配置（COOKING_TIME_MS, TICK_INTERVAL_MS）
├── domain.ts            领域模型 + 纯函数 + Port 接口（IDataPort）
├── infrastructure.ts    Port 的内存实现（InMemoryPort）
├── store.ts             Zustand store（全部 async，面向 IDataPort）
├── helpers.ts           fmt() 时间格式化工具
├── App.tsx              根组件：store 初始化 + 心跳 + 角色路由
├── index.css            Tailwind + 麦当劳主题色
├── components/
│   ├── RoleSwitcher.tsx  角色切换下拉框
│   ├── OrderCard.tsx     通用订单卡片
│   ├── BotCard.tsx       机器人卡片（含进度条 + VIP 标记）
│   ├── ManagerView.tsx   经理三列调度面板
│   ├── CustomerView.tsx  顾客双列视图
│   └── ControlPanel.tsx  操作按钮
└── __tests__/
    ├── domain.test.ts    领域逻辑测试（15 个）
    └── store.test.ts     Store 集成测试（15 个）
```

## 分层架构

```
App.tsx  ── 角色路由 → ManagerView / CustomerView
   │
Zustand Store ── 所有 action 都是 async
   │
IDataPort (interface) — 纯异步数据抽象边界
   │
InMemoryPort (当前) / HttpPort (未来)
```

## 核心设计决策

### 1. 所有数据操作都是异步的

`IDataPort` 全部返回 `Promise`，为对接后端铺路。

Store 构造时注入 IDataPort，换后端实现零改动。

### 2. Domain 层零框架依赖

`domain.ts` 只包含类型定义和纯函数，可移植到任何环境。

### 3. 三个角色视图

| 角色 | 视图 | 可操作 |
|------|------|--------|
| normal-customer | 顾客双列 | 下普通单，看自己排队 |
| vip-customer | 顾客双列 | 下 VIP 单，看自己排队 |
| manager | 经理三列 | 全部：下单 + 机器人管理 + 调度面板 |

角色通过顶栏下拉切换，`placedBy` 标记谁下的单，数据在切换时完整保留。

### 4. 系统心跳（Tick）

- `TICK_INTERVAL_MS` 驱动 `tick(now)` 纯函数
- tick 处理：超时完成 + 空闲 Bot 接单
- store 只存 `startedAt`，进度条由 UI 层根据 `now - startedAt` 计算
- 进度条动画时长与 `TICK_INTERVAL_MS` 联动

### 5. 数据流

```
点击按钮 → Store async action → await Port → 纯函数处理 → set({ orders: [...], bots: [...] })
定时器   → store.tick(now)    → await Port → tick() 原地修改 → set({ orders: [...], bots: [...] })
```

所有 `set()` 传新数组引用，保证 Zustand 正确 diff。

## 核心数据

```typescript
interface Order {
  id: number                      // 独立自增
  type: 'normal' | 'vip'
  status: 'pending' | 'processing' | 'completed'
  placedBy: 'normal-customer' | 'vip-customer' | 'manager'
  userId: number                  // MVP mock: 0=经理, 1=普通, 2=VIP
  createdAt: number               // 下单时间（unix ms）
  completedAt?: number            // 完成时间（unix ms）
}

interface Bot {
  id: number                      // 独立自增（不跟订单共用）
  status: 'idle' | 'processing'
  orderId: number | null
  startedAt: number | null
  createdAt: number
}
```

## 扩展点

1. **对接后端**：实现 `IDataPort` 的 HTTP 版本，Store 零改动
2. **新增订单类型**：`OrderType` 加值，`sortPending` 调排序
3. **修改烹饪时间**：改 `config.ts` 的 `COOKING_TIME_MS`
4. **新增角色**：加 `Role` 类型，App.tsx 加路由
