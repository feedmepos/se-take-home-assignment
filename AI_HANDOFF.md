# 🤖 AI Handoff — McDonald's Kitchen Controller

> 技术栈、文件结构、架构分层、设计决策见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 你下一步可能需要做的事

以下指引帮你快速定位代码位置：

### 修改订单相关的领域逻辑
看 `domain.ts` → `Order` 接口、`OrderType`、`OrderStatus`、`Role` 等类型定义在这里。排序和状态流转的纯函数也在这里。

### 修改机器人相关的领域逻辑
看 `domain.ts` → `Bot` 接口、`BotStatus`、`tick()` 函数。

### 新增一个 Store Action
看 `store.ts` → 所有 action 都是 async，面向 `IDataPort` 编程。参考 `addOrder` 的模式。

### 替换数据存储（内存 → HTTP）
1. 新建文件实现 `IDataPort` 接口（参考 `infrastructure.ts` 的 `InMemoryPort`）
2. 在 `App.tsx` 中把 `new InMemoryPort()` 换成你的实现
3. Store 和其他代码零改动

### 修改 UI 组件
`src/components/` 下按角色拆分：
- `ManagerView.tsx` — 经理三列调度面板
- `CustomerView.tsx` — 顾客双列视图
- `OrderCard.tsx` / `BotCard.tsx` — 卡片组件
- `ControlPanel.tsx` — 操作按钮
- `RoleSwitcher.tsx` — 角色切换

### 修改配置（烹饪时间、心跳间隔）
看 `config.ts` → `COOKING_TIME_MS`、`TICK_INTERVAL_MS`。

### 修改或新增测试
看 `src/__tests__/`：
- `domain.test.ts` — 纯函数测试
- `store.test.ts` — Store action 集成测试

测试风格：纯函数无 mock，store action 用真实 `InMemoryPort`，全部 `async/await`。

## 业务规则对照

| 规则 | 代码位置 |
|------|---------|
| VIP 排在 Normal 前，同类按时间 | `domain.ts` → `sortPending()` |
| +Bot 立即取单 | `store.ts` → `addBot()` |
| -Bot 优先级：空闲 > 普通单 > VIP 单 | `store.ts` → `removeBot()` |
| Bot 完成 → 同 tick 接下一单 | `domain.ts` → `tick()` |
| 订单/Bot ID 独立自增 | `infrastructure.ts` → `InMemoryPort` |

## 命令

```bash
npm install       # 安装依赖
npm run dev       # 启动开发
npm test          # 运行 30 个测试
npm run build     # 构建生产
```
