# McDonald's Order Controller - 规格文档

## Why
麦当劳需要在 COVID-19 期间实现自动化烹饪机器人系统，减少人力并提高效率。本系统作为订单控制器，负责处理订单控制流程，支持高并发场景（百万人同时下订单、数万个餐厅）。

## What Changes
- 实现基于 DDD 的订单控制系统
- 支持 VIP 和普通客户的优先级队列
- 实现烹饪机器人的动态增减
- 支持高并发 ID 生成（分布式雪花算法）
- 实现订单状态流转（PENDING -> PROCESSING -> COMPLETE）
- 提供 CLI 交互界面
- **BREAKING**: 无（新项目）

## Impact
- Affected specs: 订单管理、机器人调度、优先级队列
- Affected code: domain/, application/, infrastructure/, interfaces/ 目录

## ADDED Requirements

### Requirement: 订单管理
系统 SHALL 提供订单创建和管理功能。

#### Scenario: 创建普通订单
- **WHEN** 用户点击 "New Normal Order"
- **THEN** 系统 SHALL 生成唯一递增订单号
- **AND** 订单 SHALL 出现在 PENDING 区域末尾

#### Scenario: 创建 VIP 订单
- **WHEN** 用户点击 "New VIP Order"
- **THEN** 系统 SHALL 生成唯一递增订单号
- **AND** 订单 SHALL 插入到所有普通订单之前、所有 VIP 订单之后

#### Scenario: 订单号生成（高并发）
- **GIVEN** 百万人同时下订单
- **WHEN** 系统生成订单号
- **THEN** 订单号 SHALL 全局唯一且递增
- **AND** 支持数万个餐厅隔离

### Requirement: 机器人管理
系统 SHALL 支持烹饪机器人的动态增减。

#### Scenario: 增加机器人
- **WHEN** 用户点击 "+ Bot"
- **THEN** 系统 SHALL 创建新机器人
- **AND** 机器人 SHALL 立即开始处理 PENDING 区域订单
- **AND** 处理时间为 10 秒
- **AND** 完成后订单移动到 COMPLETE 区域

#### Scenario: 减少机器人
- **WHEN** 用户点击 "- Bot"
- **THEN** 系统 SHALL 销毁最新的机器人
- **AND** 如果机器人正在处理订单，订单 SHALL 返回 PENDING 区域原位置

#### Scenario: 机器人空闲
- **GIVEN** PENDING 区域无订单
- **WHEN** 机器人完成当前订单
- **THEN** 机器人 SHALL 进入 IDLE 状态
- **AND** 新订单到达时自动恢复处理

### Requirement: 优先级队列
系统 SHALL 实现 VIP 优先的订单队列。

#### Scenario: VIP 优先
- **GIVEN** PENDING 区域有普通订单和 VIP 订单
- **WHEN** 机器人选择下一个订单
- **THEN** 优先选择最早进入的 VIP 订单
- **AND** 无 VIP 订单时选择最早进入的普通订单

#### Scenario: 同类型 FIFO
- **GIVEN** 多个同类型订单在 PENDING 区域
- **WHEN** 机器人选择订单
- **THEN** 按照先进先出顺序处理

### Requirement: CLI 输出
系统 SHALL 提供带时间戳的 CLI 输出。

#### Scenario: 输出格式
- **WHEN** 系统执行操作
- **THEN** 输出 SHALL 包含 HH:MM:SS 格式时间戳
- **AND** 输出 SHALL 保存到 result.txt

## MODIFIED Requirements
无

## REMOVED Requirements
无

## 项目优势

### 1. 功能实现优势
- **优先级队列**：实现了 VIP 优先的订单处理机制，确保重要客户获得更快服务
- **动态机器人管理**：支持机器人的实时增减，根据订单量灵活调整处理能力
- **批量操作支持**：命令支持 1-10 个数量参数，提高操作效率
- **实时状态监控**：每个命令执行后自动显示系统状态，提供即时反馈

### 2. 性能表现优势
- **高并发 ID 生成**：采用雪花算法，支持百万人同时下单，订单号全局唯一且递增
- **优先级队列优化**：基于堆结构的优先级队列，订单插入和取出时间复杂度为 O(log n)
- **事件驱动架构**：使用 context 和 ticker 实现高效的机器人调度
- **跨平台支持**：兼容 Windows、Linux 和 macOS 等多种操作系统

### 3. 用户体验优势
- **直观的 CLI 界面**：提供简洁明了的命令行交互，支持命令历史和帮助信息
- **详细的状态输出**：显示机器人状态、待处理订单和已完成订单的详细信息
- **友好的错误提示**：对无效命令和参数提供清晰的错误信息
- **批量操作反馈**：批量创建或删除时显示每个操作的详细结果

### 4. 系统可靠性优势
- **优雅关闭**：支持系统优雅关闭，确保正在处理的订单不会丢失
- **错误处理机制**：完善的错误处理，保证系统稳定性
- **数据一致性**：机器人移除时确保正在处理的订单返回队列，避免订单丢失
- **可测试性**：全面的单元测试和集成测试，确保系统质量

### 5. 可扩展性优势
- **DDD 架构**：采用领域驱动设计，代码结构清晰，易于维护和扩展
- **模块化设计**：各组件职责明确，便于独立开发和测试
- **接口抽象**：通过接口定义，支持不同实现的替换
- **配置灵活性**：支持通过命令行参数调整系统行为
