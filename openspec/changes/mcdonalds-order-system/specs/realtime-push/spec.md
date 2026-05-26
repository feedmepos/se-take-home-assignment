## ADDED Requirements

### Requirement: WebSocket pushes order completed event
订单处理完成后 SHALL 通过 WebSocket 推送 `order:completed` 事件给所有连接的客户端。

#### Scenario: Order completed event broadcast
- **WHEN** 机器人完成订单处理（10 秒后）
- **THEN** 所有 WebSocket 客户端收到 `{ event: "order:completed", payload: Order }` 消息

#### Scenario: Multiple clients receive same event
- **WHEN** 多个客户端连接 WebSocket，一个订单完成
- **THEN** 所有客户端均收到相同的 `order:completed` 事件

### Requirement: WebSocket pushes bot status changed event
机器人状态变更 SHALL 通过 WebSocket 推送 `bot:status_changed` 事件。

#### Scenario: Bot status changed event broadcast
- **WHEN** 机器人状态在 IDLE 和 PROCESSING 之间切换
- **THEN** 所有 WebSocket 客户端收到 `{ event: "bot:status_changed", payload: { botId, status, currentOrderId? } }` 消息

### Requirement: WebSocket does not push other events
创建订单和增减机器人的事件 SHALL NOT 通过 WebSocket 推送，客户端通过 REST API 刷新获取。

#### Scenario: Order creation not pushed via WS
- **WHEN** 新订单创建
- **THEN** WebSocket 不推送任何消息，客户端通过 GET /api/orders 刷新列表

#### Scenario: Bot add/remove not pushed via WS
- **WHEN** 机器人被创建或销毁
- **THEN** WebSocket 不推送任何消息，客户端通过 GET /api/bots 刷新列表
