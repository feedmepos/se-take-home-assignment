## ADDED Requirements

### Requirement: 双队列存储
系统 SHALL 使用两个独立队列存储待处理订单：`vipQueue` 存储 VIP 订单，`normalQueue` 存储普通订单。每个队列内部保持 FIFO（先进先出）顺序。

#### Scenario: VIP 和 Normal 分别入队
- **WHEN** 依次创建订单 #1(Normal), #2(VIP), #3(Normal), #4(VIP)
- **THEN** vipQueue = [#2, #4]，normalQueue = [#1, #3]

### Requirement: PENDING 区域展示
系统 SHALL 在 PENDING 区域按双队列拼接顺序展示所有 `pending` 状态订单：先展示 `vipQueue` 全部内容，再展示 `normalQueue` 全部内容。每个订单显示订单号和类型标识。

#### Scenario: PENDING 区域初始为空
- **WHEN** 系统首次加载且无任何订单
- **THEN** PENDING 区域显示空状态提示

#### Scenario: PENDING 区域 VIP 优先展示
- **WHEN** vipQueue = [#2, #4]，normalQueue = [#1, #3]
- **THEN** PENDING 区域展示顺序为 #2(VIP), #4(VIP), #1(Normal), #3(Normal)

#### Scenario: 仅有 Normal 订单时
- **WHEN** vipQueue 为空，normalQueue = [#1, #3, #5]
- **THEN** PENDING 区域展示顺序为 #1(Normal), #3(Normal), #5(Normal)

#### Scenario: 仅有 VIP 订单时
- **WHEN** vipQueue = [#2, #6]，normalQueue 为空
- **THEN** PENDING 区域展示顺序为 #2(VIP), #6(VIP)

### Requirement: COMPLETE 区域展示
系统 SHALL 在 COMPLETE 区域展示所有状态为 `completed` 的订单，显示订单号和订单类型。

#### Scenario: 订单完成后移入 COMPLETE
- **WHEN** 一个订单被机器人处理完成（10 秒后）
- **THEN** 该订单从 PENDING 区域移除，出现在 COMPLETE 区域

#### Scenario: COMPLETE 区域显示所有已完成订单
- **WHEN** 机器人完成了 3 个订单的处理
- **THEN** COMPLETE 区域显示全部 3 个已完成订单

### Requirement: 订单状态实时更新
系统 SHALL 在订单状态变更时实时更新对应区域的 UI 展示，无需用户手动刷新。

#### Scenario: 订单从 PENDING 变为处理中
- **WHEN** 机器人取走一个 PENDING 订单开始处理
- **THEN** 该订单从 PENDING 区域移除（从对应队列中出队）

#### Scenario: 订单从处理中变为已完成
- **WHEN** 机器人完成订单处理
- **THEN** 该订单立即显示在 COMPLETE 区域

### Requirement: 机器人取单顺序
系统 SHALL 确保机器人取单时严格优先从 `vipQueue` 队首取单，仅当 `vipQueue` 为空时才从 `normalQueue` 队首取单。

#### Scenario: VIP 队列有订单时优先取 VIP
- **WHEN** vipQueue = [#2]，normalQueue = [#1, #3]
- **AND** 机器人需要取单
- **THEN** 机器人取走订单 #2（VIP），而非订单 #1

#### Scenario: VIP 队列为空时取 Normal
- **WHEN** vipQueue 为空，normalQueue = [#1, #3]
- **AND** 机器人需要取单
- **THEN** 机器人取走订单 #1（Normal）

### Requirement: 角色切换不影响订单视图
系统 SHALL 确保顾客和经理角色看到的 PENDING 和 COMPLETE 区域完全一致。

#### Scenario: 角色切换后订单视图不变
- **WHEN** PENDING 区域有 3 个订单，COMPLETE 区域有 2 个订单
- **AND** 用户从顾客切换到经理
- **THEN** PENDING 和 COMPLETE 区域的订单展示完全一致
