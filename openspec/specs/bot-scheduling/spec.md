## ADDED Requirements

### Requirement: Add Bot
系统 SHALL 支持添加新的烹饪机器人，机器人 ID 唯一且递增。

#### Scenario: 添加机器人成功
- **WHEN** 用户请求添加机器人
- **THEN** 系统创建一个新的机器人，ID 为当前最大 ID + 1
- **THEN** 机器人状态为 `idle`

#### Scenario: 新机器人立即处理待处理订单
- **WHEN** 添加新机器人且有待处理订单
- **THEN** 机器人立即开始处理队列中的第一个订单
- **THEN** 机器人状态变为 `busy`

### Requirement: Remove Bot
系统 SHALL 支持移除指定的机器人，用户可以选择要移除哪个机器人。如果未指定，则默认移除最新创建的机器人。**忙碌状态的机器人可以被移除**，正在处理的订单应返回到 PENDING 队列的原始位置（保持 VIP/普通订单的优先级顺序）。

#### Scenario: 移除指定的空闲机器人
- **WHEN** 用户请求移除指定 ID 的机器人且该机器人为 `idle`
- **THEN** 指定的机器人被移除

#### Scenario: 移除忙碌的机器人并回退订单
- **WHEN** 用户请求移除正在处理订单的机器人（状态为 `busy`）
- **THEN** 机器人被移除
- **THEN** 当前处理的订单停止处理
- **THEN** 订单状态变为 `pending`
- **THEN** 订单返回到 PENDING 队列的原始位置（VIP 在普通前，按创建时间排序）
- **THEN** 如果有其他空闲机器人，立即开始处理下一个订单

#### Scenario: 未指定时默认移除最新创建的机器人
- **WHEN** 用户请求移除机器人但未指定 ID
- **THEN** 系统移除最新创建的机器人（无论状态如何）
- **THEN** 如果该机器人正在处理订单，订单按优先级返回到队列

### Requirement: Bot Process Order
系统必须让机器人一次处理一个订单，处理时间为 10 秒。

#### Scenario: 机器人处理订单
- **WHEN** 机器人开始处理订单
- **THEN** 机器人状态变为 `busy`
- **THEN** 订单状态变为 `processing`
- **THEN** 10 秒后订单处理完成

#### Scenario: 订单完成后继续下一个
- **WHEN** 机器人完成一个订单且有待处理订单
- **THEN** 机器人立即开始处理下一个订单

#### Scenario: 无待处理订单时机器人空闲
- **WHEN** 机器人完成订单且无待处理订单
- **THEN** 机器人状态变为 `idle`

### Requirement: Bot Status Tracking
系统 SHALL 跟踪每个机器人的状态和当前处理的订单。

#### Scenario: 机器人状态显示
- **WHEN** 查询机器人状态
- **THEN** 显示机器人是 `idle` 还是 `busy`
- **THEN** 如果 `busy`，显示当前处理的订单和剩余时间
