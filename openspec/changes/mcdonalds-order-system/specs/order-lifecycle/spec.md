## ADDED Requirements

### Requirement: Order enters PENDING on creation
新创建的订单 SHALL 立即出现在 PENDING 区域。

#### Scenario: Normal order created
- **WHEN** 用户点击 "New Normal Order"
- **THEN** 一个新 Normal 订单出现在 PENDING 区域，带有唯一递增的订单号

#### Scenario: VIP order created
- **WHEN** 用户点击 "New VIP Order"
- **THEN** 一个新 VIP 订单出现在 PENDING 区域，位于所有 Normal 订单之前

### Requirement: Order transitions to PROCESSING when bot picks it up
订单被机器人取走后 SHALL 在后端变为 PROCESSING 状态，前端仍将其展示在 PENDING 列。

#### Scenario: Order enters PROCESSING state
- **WHEN** 机器人取走一个 PENDING 订单开始处理
- **THEN** 订单在后端状态变为 PROCESSING，不能再被其他 bot 取走

#### Scenario: Order being processed remains in PENDING column
- **WHEN** 订单处于 PROCESSING 状态
- **THEN** 前端 PENDING 列同时展示 PENDING 和 PROCESSING 状态的订单

### Requirement: Order moves to COMPLETE via WebSocket event
订单处理完成后 SHALL 通过 WebSocket `order:completed` 事件通知前端移入 COMPLETE 区域。

#### Scenario: Order completes processing
- **WHEN** 机器人完成订单处理（取单后 10 秒）
- **THEN** 服务端通过 WebSocket 推送 `order:completed` 事件，前端将该订单从 PENDING 列移至 COMPLETE 列

#### Scenario: Completed orders show in COMPLETE area
- **WHEN** 多个订单已完成处理
- **THEN** COMPLETE 区域按完成时间顺序展示所有已完成订单

### Requirement: Timestamp tracking
系统 SHALL 以 HH:MM:SS 格式记录订单完成时间。

#### Scenario: Complete order has timestamp
- **WHEN** 一个订单通过 `order:completed` 事件进入 COMPLETE 区域
- **THEN** 该订单附带 HH:MM:SS 格式的完成时间戳
