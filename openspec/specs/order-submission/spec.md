## ADDED Requirements

### Requirement: 创建普通订单
系统 SHALL 提供"New Normal Order"按钮，点击后创建一个类型为 `normal` 的订单，订单号唯一递增，初始状态为 `pending`，追加到 Normal 队列队尾，展示在 PENDING 区域所有 VIP 订单之后，并记录活动日志。

#### Scenario: 点击创建普通订单
- **WHEN** 用户点击 "New Normal Order" 按钮
- **THEN** 系统创建一个新订单，订单号为当前最大编号 + 1，类型为 normal，状态为 pending
- **AND** 该订单追加到 Normal 队列队尾
- **AND** 该订单显示在 PENDING 区域中所有 VIP 订单之后、其他 Normal 订单按创建顺序排列
- **AND** 日志中记录 `订单 #N (Normal) 已创建`

#### Scenario: 订单号从 1 开始递增
- **WHEN** 系统中尚无任何订单且用户点击 "New Normal Order"
- **THEN** 创建的订单号为 1
- **AND** 后续每次创建订单，订单号在上一个基础上 + 1

### Requirement: 创建 VIP 订单
系统 SHALL 提供"New VIP Order"按钮，点击后创建一个类型为 `vip` 的订单，订单号唯一递增，初始状态为 `pending`，追加到 VIP 队列队尾，展示在 PENDING 区域所有 VIP 订单之后、所有普通订单之前。

#### Scenario: 点击创建 VIP 订单
- **WHEN** 用户点击 "New VIP Order" 按钮
- **THEN** 系统创建一个新订单，类型为 vip，状态为 pending
- **AND** 该订单追加到 VIP 队列队尾
- **AND** 该订单排在 PENDING 区域中所有现有 VIP 订单之后、所有普通订单之前
- **AND** 日志中记录 `订单 #N (VIP) 已创建`

#### Scenario: 多个 VIP 订单的排序
- **WHEN** VIP 队列已有订单 #1，Normal 队列已有订单 #2, #3
- **AND** 用户创建一个新的 VIP 订单（#4）
- **THEN** VIP 队列为 [#1, #4]，Normal 队列为 [#2, #3]
- **AND** PENDING 区域展示顺序为：#1(VIP), #4(VIP), #2(Normal), #3(Normal)

### Requirement: 订单号全局唯一递增
系统 SHALL 确保所有订单（无论 Normal 还是 VIP）共享同一个自增计数器，保证订单号全局唯一且连续递增。

#### Scenario: 混合创建订单号连续递增
- **WHEN** 用户依次点击：New Normal Order → New VIP Order → New Normal Order
- **THEN** 创建的订单号依次为 1, 2, 3

### Requirement: 仅顾客可创建订单
系统 SHALL 仅允许顾客角色创建订单，经理角色不可见、不可调用订单创建功能。

#### Scenario: 顾客创建订单
- **WHEN** 当前角色为"顾客"且点击 "New Normal Order"
- **THEN** 订单正常创建，显示在 PENDING 区域

#### Scenario: 经理不可见创建订单按钮
- **WHEN** 当前角色为"经理"
- **THEN** "New Normal Order" 和 "New VIP Order" 按钮均不可见
- **AND** "创建订单"面板标题不可见
