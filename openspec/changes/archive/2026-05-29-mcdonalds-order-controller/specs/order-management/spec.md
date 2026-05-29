## ADDED Requirements

### Requirement: Create Normal Order
系统 SHALL 支持创建普通订单，订单 ID 唯一且递增。

#### Scenario: 创建普通订单成功
- **WHEN** 用户请求创建普通订单
- **THEN** 系统返回一个新的普通订单，订单 ID 为当前最大 ID + 1
- **THEN** 订单状态为 `pending`

### Requirement: Create VIP Order
系统 SHALL 支持创建 VIP 订单，VIP 订单优先级高于普通订单。

#### Scenario: 创建 VIP 订单成功
- **WHEN** 用户请求创建 VIP 订单
- **THEN** 系统返回一个新的 VIP 订单，订单 ID 为当前最大 ID + 1

#### Scenario: VIP 订单优先于普通订单
- **WHEN** 队列中已有普通订单，然后创建 VIP 订单
- **THEN** VIP 订单排在所有普通订单前面
- **THEN** 但排在已存在的 VIP 订单后面

### Requirement: Priority Queue Order
系统 SHALL 维护一个优先级队列，VIP 订单优先，同类型按创建时间排序。

#### Scenario: 队列排序规则
- **WHEN** 队列中有 VIP 订单和普通订单
- **THEN** 所有 VIP 订单排在普通订单前面
- **THEN** VIP 订单之间按创建时间排序（先创建的在前）
- **THEN** 普通订单之间按创建时间排序

### Requirement: Order State Transition
系统 SHALL 管理订单状态从 `pending` → `processing` → `completed` 的转换。

#### Scenario: 订单完成处理
- **WHEN** 订单处理完成（10秒后）
- **THEN** 订单状态变为 `completed`
- **THEN** 订单记录完成时间（HH:MM:SS 格式）

### Requirement: Reinsert Pending Order
系统 SHALL 支持将正在处理的订单重新插入队列，保持其原始优先级位置。

#### Scenario: 机器人被移除时订单返回队列
- **WHEN** 正在处理订单的机器人被移除
- **THEN** 该订单返回到 `pending` 队列
- **THEN** 订单位置保持其原始优先级（VIP 在普通前，按创建时间排序）
