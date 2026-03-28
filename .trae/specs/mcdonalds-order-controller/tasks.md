# Tasks

## 阶段 1: 项目初始化与领域模型设计

- [x] Task 1: 初始化 Go 项目结构
  - [x] SubTask 1.1: 创建 go.mod 文件
  - [x] SubTask 1.2: 创建 DDD 目录结构 (domain/, application/, infrastructure/, interfaces/)
  - [x] SubTask 1.3: 更新 scripts/build.sh, scripts/test.sh, scripts/run.sh

- [x] Task 2: 设计领域模型 (TDD)
  - [x] SubTask 2.1: 定义 Order 实体 (ID, Type, Status, CreatedAt)
  - [x] SubTask 2.2: 定义 OrderType 值对象 (Normal, VIP)
  - [x] SubTask 2.3: 定义 OrderStatus 值对象 (Pending, Processing, Complete)
  - [x] SubTask 2.4: 编写 Order 实体单元测试

- [x] Task 3: 设计高并发 ID 生成器 (TDD)
  - [x] SubTask 3.1: 实现 Snowflake 算法
  - [x] SubTask 3.2: 支持多餐厅隔离 (RestaurantID)
  - [x] SubTask 3.3: 编写 ID 生成器单元测试 (并发安全)

## 阶段 2: 优先级队列与机器人调度

- [x] Task 4: 实现优先级队列 (TDD)
  - [x] SubTask 4.1: 设计 PriorityQueue 数据结构
  - [x] SubTask 4.2: 实现 VIP 优先逻辑
  - [x] SubTask 4.3: 实现订单位置保持（机器人减少时）
  - [x] SubTask 4.4: 编写优先级队列单元测试

- [x] Task 5: 实现烹饪机器人 (TDD)
  - [x] SubTask 5.1: 定义 Bot 实体 (ID, Status, CurrentOrder)
  - [x] SubTask 5.2: 实现订单处理逻辑 (10秒处理时间)
  - [x] SubTask 5.3: 实现 Bot 状态管理 (Idle, Processing)
  - [x] SubTask 5.4: 编写 Bot 单元测试

- [x] Task 6: 实现机器人调度器 (TDD)
  - [x] SubTask 6.1: 设计 BotScheduler 聚合根
  - [x] SubTask 6.2: 实现动态增减机器人
  - [x] SubTask 6.3: 实现订单分配策略
  - [x] SubTask 6.4: 编写调度器单元测试

## 阶段 3: 应用层与基础设施

- [x] Task 7: 实现应用服务 (TDD)
  - [x] SubTask 7.1: 实现 OrderService (创建订单)
  - [x] SubTask 7.2: 实现 BotService (管理机器人)
  - [x] SubTask 7.3: 实现查询服务 (获取状态)
  - [x] SubTask 7.4: 编写应用服务单元测试

- [x] Task 8: 实现仓库 (TDD)
  - [x] SubTask 8.1: 实现 OrderRepository (内存实现)
  - [x] SubTask 8.2: 实现 BotRepository (内存实现)
  - [x] SubTask 8.3: 编写仓库单元测试

## 阶段 4: CLI 界面与集成

- [x] Task 9: 实现 CLI 交互界面
  - [x] SubTask 9.1: 设计命令结构 (new-normal, new-vip, +bot, -bot, status)
  - [x] SubTask 9.2: 实现命令解析器
  - [x] SubTask 9.3: 实现带时间戳的输出格式
  - [x] SubTask 9.4: 编写 CLI 集成测试

- [x] Task 10: 集成测试与验证
  - [x] SubTask 10.1: 编写端到端场景测试
  - [x] SubTask 10.2: 验证高并发场景
  - [x] SubTask 10.3: 验证 GitHub Actions 兼容性

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 1
- Task 4 依赖 Task 2
- Task 5 依赖 Task 2
- Task 6 依赖 Task 4, Task 5
- Task 7 依赖 Task 3, Task 6
- Task 8 依赖 Task 2, Task 5
- Task 9 依赖 Task 7, Task 8
- Task 10 依赖 Task 9
