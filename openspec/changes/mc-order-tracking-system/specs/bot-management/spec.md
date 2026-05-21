## ADDED Requirements

### Requirement: 增加机器人（仅经理）
系统 SHALL 为经理角色提供"+ Bot"按钮，点击后创建一个新的机器人实例，该机器人立即尝试按双队列优先级取单（先 VIP 后 Normal）开始处理，并记录日志。

#### Scenario: 经理增加机器人，VIP 队列有订单
- **WHEN** 当前角色为"经理"，vipQueue 有订单 #2，normalQueue 有订单 #1
- **AND** 经理点击 "+ Bot"
- **THEN** 系统创建一个新机器人，该机器人从 vipQueue 取走订单 #2 开始处理
- **AND** 日志中记录 `机器人 #M 已上线` 和 `机器人 #M 开始处理订单 #2`

#### Scenario: 经理增加机器人，VIP 队列为空
- **WHEN** vipQueue 为空，normalQueue 有订单 #1
- **AND** 经理点击 "+ Bot"
- **THEN** 机器人从 normalQueue 取走订单 #1 开始处理

#### Scenario: 无 PENDING 订单时增加机器人
- **WHEN** vipQueue 和 normalQueue 均为空，经理点击 "+ Bot"
- **THEN** 系统创建一个新机器人，机器人状态为 IDLE，等待新订单到来
- **AND** 日志中记录 `机器人 #M 已上线`

#### Scenario: 顾客不可见 +Bot 按钮
- **WHEN** 当前角色为"顾客"
- **THEN** "+ Bot" 按钮不可见

#### Scenario: 新订单到来时 IDLE 机器人自动取单
- **WHEN** 系统中存在 1 个 IDLE 状态的机器人
- **AND** 用户创建一个新订单
- **THEN** 机器人立即按双队列优先级取单处理（先检查 vipQueue，再检查 normalQueue）
- **AND** 日志中记录 `机器人 #M 开始处理订单 #N`

### Requirement: 减少机器人（仅经理）
系统 SHALL 为经理角色提供"- Bot"按钮，点击后销毁最新创建的机器人。若该机器人正在处理订单，则停止处理并将订单按其类型放回对应队列队首（VIP 订单回 vipQueue 队首，Normal 订单回 normalQueue 队首），并记录日志。

#### Scenario: 经理减少 IDLE 机器人
- **WHEN** 存在多个机器人且最新创建的机器人状态为 IDLE
- **AND** 经理点击 "- Bot"
- **THEN** 该机器人被销毁，其余机器人不受影响
- **AND** 日志中记录 `机器人 #M 已下线`

#### Scenario: 经理减少正在处理 VIP 订单的机器人
- **WHEN** 最新机器人正在处理 VIP 订单 #3
- **AND** vipQueue = [#6]，normalQueue = [#5]
- **AND** 经理点击 "- Bot"
- **THEN** 该机器人被销毁，VIP 订单 #3 放回 vipQueue 队首
- **AND** vipQueue 变为 [#3, #6]
- **AND** PENDING 区域顺序变为 #3(VIP), #6(VIP), #5(Normal)
- **AND** 日志中记录 `机器人 #M 已下线` 和 `订单 #3 退回 PENDING（机器人 #M 已销毁）`

#### Scenario: 经理减少正在处理 Normal 订单的机器人
- **WHEN** 最新机器人正在处理 Normal 订单 #5
- **AND** normalQueue = [#7, #8]
- **AND** 经理点击 "- Bot"
- **THEN** Normal 订单 #5 放回 normalQueue 队首
- **AND** normalQueue 变为 [#5, #7, #8]

#### Scenario: 顾客不可见 -Bot 按钮
- **WHEN** 当前角色为"顾客"
- **THEN** "- Bot" 按钮不可见

#### Scenario: 只剩 1 个机器人时减少
- **WHEN** 系统中只有 1 个机器人
- **AND** 经理点击 "- Bot"
- **THEN** 该机器人被销毁，机器人数量变为 0
- **AND** 若有进行中订单，该订单按其类型放回对应队列队首

#### Scenario: 无机器人时 -Bot 按钮禁用
- **WHEN** 系统中没有机器人
- **THEN** "- Bot" 按钮为禁用状态

### Requirement: 机器人单次处理一个订单
系统 SHALL 确保每个机器人在同一时间只处理 1 个订单。

#### Scenario: 机器人不会同时处理多个订单
- **WHEN** 1 个机器人正在处理订单
- **THEN** 该机器人不会取走新的订单，直到当前订单处理完成

### Requirement: 订单处理时间
系统 SHALL 为每个订单的处理设定 10 秒的处理时间，处理完成后订单自动移入 COMPLETE 区域。

#### Scenario: 10 秒后订单完成
- **WHEN** 机器人开始处理一个订单
- **THEN** 10 秒后该订单状态变为 completed，移入 COMPLETE 区域
- **AND** 机器人变为 IDLE，按双队列优先级尝试取下一个订单
- **AND** 日志中记录 `订单 #N 已完成，由机器人 #M 处理`

#### Scenario: 连续处理：VIP 优先
- **WHEN** 机器人完成一个订单后
- **AND** vipQueue 有订单，normalQueue 也有订单
- **THEN** 机器人优先取 vipQueue 中的下一个订单

#### Scenario: 多个机器人并行处理
- **WHEN** 系统中有 2 个机器人和 2 个 PENDING 订单（1 VIP、1 Normal）
- **THEN** 机器人 #1 取 VIP 订单，机器人 #2 取 Normal 订单，并行处理互不干扰

### Requirement: 机器人状态展示（所有角色）
系统 SHALL 在控制面板展示所有机器人的列表及其当前状态（IDLE 或处理中的订单号及类型），顾客和经理均可查看。

#### Scenario: 显示机器人列表
- **WHEN** 系统中有 2 个机器人（1 个 IDLE，1 个正在处理订单 #3）
- **THEN** 控制面板显示机器人 #1 状态为 "Processing Order #3 (VIP)"，机器人 #2 状态为 "IDLE"

#### Scenario: 顾客可查看机器人状态但不可操作
- **WHEN** 当前角色为"顾客"且有机器人在运行
- **THEN** 机器人状态列表可见，但 +Bot / -Bot 按钮不可见
