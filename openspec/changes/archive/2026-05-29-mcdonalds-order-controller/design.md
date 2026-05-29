## Context

本项目是麦当劳自动化烹饪机器人订单控制系统的后端实现。需要使用 Node.js 或 Go 实现，并且必须能够在 GitHub Actions 中运行验证。项目结构需要清晰，代码质量高，易于测试和维护。

## Goals / Non-Goals

**Goals:**
- 实现订单控制器核心逻辑，支持普通订单和 VIP 订单的优先级队列管理
- 实现机器人的动态添加/移除和订单调度
- 提供基于 Ink + React 的交互模式，用户可以通过按钮操作
- 提供无头模式，输出带时间戳的日志到 result.txt，用于自动化验证
- 实现完整的脚本（build.sh、test.sh、run.sh）以通过 GitHub Actions 检查

**Non-Goals:**
- 数据持久化（无需数据库）
- 网络服务或 API（仅 CLI 应用）
- 多个餐厅或分布式系统支持

## Decisions

### 技术栈选择
- **Node.js + TypeScript**：TypeScript 提供类型安全，Node.js 生态有成熟的 Ink 库用于 CLI 交互界面
- **Ink + React**：声明式 UI，易于实现复杂的交互界面
- **Vitest**：快速的测试运行器，与 Vite 生态兼容
- **Node.js events 模块**：原生事件驱动架构，EventBus 单例模式

### 事件驱动架构
- **EventBus 单例**：全局事件总线，负责主程序与机器人的通信
- **Bot 类**：继承 EventEmitter，独立管理自己的状态和处理逻辑
  - 方法：`startProcessing()`, `destroy()`
  - 事件：`bot:started`, `bot:completed`, `bot:idle`, `bot:destroyed`, `bot:error`
- **推模式订单分配**：主程序 OrderController 主动给机器人分配订单
- **错误处理**：机器人处理失败时通过 `bot:error` 事件通知主程序，主程序打印到日志
- **可测试性**：
  - Bot 类独立，可单独测试
  - EventBus 可注入 mock
  - Timer 类支持依赖注入

### 项目结构
```
src/
├── index.ts                    # 入口文件，判断模式
├── controller/
│   ├── OrderController.ts      # 核心控制器
│   ├── Order.ts                # 订单类型和工厂（包含商品关联）
│   ├── Bot.ts                  # 机器人类型（接收并处理商品信息）
│   └── Product.ts              # 商品类型和数据管理
├── cli/
│   ├── headless.ts             # 无头模式实现
│   └── interactive/
│       ├── index.tsx
│       ├── App.tsx             # 主界面
│       └── components/
│           ├── Button.tsx      # 按钮组件
│           ├── OrderList.tsx   # 订单列表（显示商品信息）
│           └── BotStatus.tsx   # 机器人状态（显示处理中的商品）
└── utils/
    ├── logger.ts               # 日志工具
    └── timer.ts                # 可测试的定时器

scripts/
├── build.sh    # 编译
├── test.sh     # 测试
└── run.sh      # 运行
```

### 优先级队列实现
- VIP 订单优先级高于普通订单
- 同类型订单按创建时间排序（FIFO）
- 使用数组存储，插入时找到合适位置
- 机器人被移除时，将正在处理的订单插回原始位置（根据类型和创建时间）

### 商品模块设计
- **Product 接口**：定义商品数据结构
  - `id: number` - 商品唯一标识
  - `name: string` - 商品名称
  - `price: number` - 商品价格
  - `category: string` - 商品类别（如汉堡、小食、饮品）
- **ProductManager 类**：单例模式，管理商品数据
  - `getProducts(): Product[]` - 获取所有商品
  - `getProductById(id: number): Product | undefined` - 根据ID获取商品
  - `getRandomProduct(): Product` - 随机获取一个商品（用于创建订单时）
- **预定义数据**：系统启动时加载麦当劳菜单数据到内存
- **无持久化**：商品数据仅在内存中，不需要数据库

### 订单与商品关联设计
- **Order 接口扩展**：
  - 新增 `product: Product` 字段，记录订单关联的商品
  - 创建订单时从 ProductManager 随机选择或指定商品
- **工厂函数更新**：
  - `createNormalOrder(): Order` - 创建普通订单并关联随机商品
  - `createVIPOrder(): Order` - 创建VIP订单并关联随机商品
- **界面显示**：
  - 订单列表中显示商品名称和价格
  - 已完成订单区域显示购买的商品信息

### 机器人调度策略
- 新机器人创建后立即检查待处理订单
- 订单完成后自动处理下一个待处理订单
- 每个订单处理时间为 10 秒
- 支持移除指定 ID 的机器人，如果未指定 ID 则默认移除最新创建的（LIFO）
- 忙碌状态的机器人不能被删除，系统会给出提示

### 机器人与商品信息传递
- **Bot 类扩展**：
  - `currentOrder: Order | null` 字段包含完整的商品信息
  - 处理订单时可通过 `currentOrder.product` 访问商品数据
- **日志输出**：
  - 机器人开始处理时：`[Bot #1] 开始烹饪: Big Mac ($5.99)`
  - 订单完成时：`[Bot #1] 烹饪完成: Big Mac`
- **状态显示**：
  - BotStatus 组件显示当前处理的商品名称和价格

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 10秒计时器在测试中不易验证 | 使用可注入的 Timer 类，便于测试时 mock |
| 交互模式和无头模式可能有行为不一致 | 两者共享同一个 OrderController 核心逻辑 |
| GitHub Actions 环境可能有特殊限制 | 使用简单的依赖，避免原生模块 |
