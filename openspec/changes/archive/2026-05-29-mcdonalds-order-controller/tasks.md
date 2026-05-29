## 1. 项目初始化

- [x] 1.1 创建 package.json 配置文件
- [x] 1.2 创建 tsconfig.json TypeScript 配置
- [x] 1.3 安装依赖（ink、react、typescript、vitest 等）

## 2. 领域模型和控制器

- [x] 2.1 实现 Order 类型和工厂函数
- [x] 2.2 实现 Bot 类型和工厂函数
- [x] 2.3 实现优先级队列 PriorityQueue
- [x] 2.4 实现 OrderController 核心逻辑
- [x] 2.5 实现 Product 接口和预定义商品数据
- [x] 2.6 实现 ProductManager 商品管理类（单例模式）
- [x] 2.7 更新 Order 类型，添加 product 字段关联商品
- [x] 2.8 更新订单工厂函数，创建订单时关联随机商品
- [x] 2.9 更新 Bot 处理逻辑，传递和显示商品信息

## 3. 基础设施和工具

- [x] 3.1 实现 logger.ts 日志工具（带时间戳）
- [x] 3.2 实现可测试的 Timer 类

## 4. CLI - 无头模式

- [x] 4.1 实现 headless.ts 无头模式逻辑
- [x] 4.2 无头模式输出到 result.txt

## 5. CLI - 交互模式

- [x] 5.1 实现 Button.tsx 按钮组件
- [x] 5.2 实现 OrderList.tsx 订单列表组件
- [x] 5.3 实现 BotStatus.tsx 机器人状态组件
- [x] 5.4 实现 App.tsx 主界面（包含操作说明提示）
- [x] 5.5 实现交互模式入口 index.tsx

## 6. 集成

- [x] 6.1 实现 index.ts 入口文件（判断模式）

## 7. 脚本

- [x] 7.1 更新 scripts/build.sh
- [x] 7.2 更新 scripts/test.sh
- [x] 7.3 更新 scripts/run.sh

## 8. 测试

- [x] 8.1 为 OrderController 编写单元测试
- [x] 8.2 为 PriorityQueue 编写单元测试
- [x] 8.3 为 ProductManager 编写单元测试
- [x] 8.4 为订单与商品关联逻辑编写测试

## 9. 验证和修复

- [x] 9.1 在本地测试所有功能
- [x] 9.2 确保 GitHub Actions 工作流程通过
