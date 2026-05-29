## Why

麦当劳在 COVID-19 期间需要减少人力依赖并提高效率，因此计划实现自动化烹饪机器人系统。我们需要创建一个订单控制器来处理订单的优先级队列、机器人调度和状态管理，以支持这一转型。

## What Changes

- 创建 Node.js + TypeScript CLI 应用
- 实现无头模式，输出带时间戳的日志到 result.txt
- 实现基于 Ink + React 的交互模式，支持按钮操作和实时界面更新
- 实现订单控制器核心逻辑：
  - 普通订单和 VIP 订单的创建与优先级队列管理（每笔订单记录关联的商品）
  - 商品模块：提供现有商品数据查询
  - 机器人的添加/移除与调度（接收并处理包含商品信息的订单）
  - 10秒订单处理流程
- 创建必要的脚本（build.sh、test.sh、run.sh）用于 GitHub Actions 验证

## Capabilities

### New Capabilities
- `order-management`: 订单创建、优先级队列管理和状态跟踪（包含商品关联）
- `product-management`: 商品数据管理，提供商品查询功能
- `bot-scheduling`: 机器人的创建、移除和订单分配调度（接收商品信息）
- `cli-interactive`: 基于 Ink 的交互模式用户界面
- `cli-headless`: 无头模式输出，用于自动化验证

### Modified Capabilities
（无现有功能需要修改）

## Impact

- 新增 src/ 目录结构，包含领域模型、控制器和表现层代码
- 新增 package.json 和 tsconfig.json 配置
- 更新 scripts/ 目录下的 build.sh、test.sh、run.sh
- 新增依赖：ink、react、typescript 等
