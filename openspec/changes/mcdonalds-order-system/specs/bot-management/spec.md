## ADDED Requirements

### Requirement: Add bot processes pending orders
新增机器人 SHALL 立即检查 PENDING 队列，若有待处理订单则开始处理。

#### Scenario: Add bot when pending orders exist
- **WHEN** PENDING 队列中有订单，用户点击 "+ Bot"
- **THEN** 新机器人被创建并立即开始处理 PENDING 队列中的第一个订单，Bot 状态变为 PROCESSING

#### Scenario: Add bot when no pending orders
- **WHEN** PENDING 队列为空，用户点击 "+ Bot"
- **THEN** 新机器人被创建并处于 IDLE 状态

### Requirement: Remove newest bot
移除机器人 SHALL 销毁最新创建的机器人。

#### Scenario: Remove idle bot
- **WHEN** 存在 IDLE 机器人，用户点击 "- Bot"
- **THEN** 最新的机器人被销毁，其他机器人不受影响

#### Scenario: Remove processing bot returns order to PENDING
- **WHEN** 最新机器人正在处理订单，用户点击 "- Bot"
- **THEN** 该机器人被销毁，其正在处理的订单回到 PENDING 区域的原始位置（VIP 在 Normal 之前）

#### Scenario: Remove bot when no bots exist
- **WHEN** 不存在任何机器人，用户点击 "- Bot"
- **THEN** 系统无变化

### Requirement: One bot processes one order at a time
每个机器人 SHALL 同时只处理一个订单，处理时长为 10 秒。

#### Scenario: Bot occupies 10 seconds per order
- **WHEN** 机器人取走一个订单
- **THEN** 该订单在 10 秒后变为 COMPLETE，期间该机器人不可取其他订单

#### Scenario: Bot picks next order after completion
- **WHEN** 机器人完成当前订单处理，且 PENDING 队列中仍有订单
- **THEN** 该机器人立即取下一个待处理订单

### Requirement: Bot becomes idle when no orders
当 PENDING 队列为空时，机器人 SHALL 保持 IDLE 状态直到新订单到来。

#### Scenario: Bot waits for new orders
- **WHEN** 机器人完成处理后 PENDING 队列为空
- **THEN** 机器人状态变为 IDLE，当新订单到来时自动开始处理

### Requirement: Bot status change via WebSocket
机器人状态变更 SHALL 通过 WebSocket `bot:status_changed` 事件推送。

#### Scenario: Bot starts processing
- **WHEN** 机器人从 IDLE 变为 PROCESSING
- **THEN** 推送 `bot:status_changed` 事件：`{ botId, status: 'PROCESSING', currentOrderId }`

#### Scenario: Bot becomes idle after completion
- **WHEN** 机器人完成订单处理且无更多 PENDING 订单
- **THEN** 推送 `bot:status_changed` 事件：`{ botId, status: 'IDLE' }`
