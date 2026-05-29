## Why

当前系统在机器人忙碌时不允许移除机器人，但根据业务需求，应该允许移除忙碌状态的机器人，并将正在处理的订单返回到 PENDING 队列的原始位置（保持 VIP/普通订单的优先级顺序）。

## What Changes

- 修改 `Bot.destroy()` 方法，允许销毁忙碌状态的机器人
- 修改 `OrderController.removeBot()` 方法，在机器人销毁时处理订单回退逻辑
- 更新订单回退机制，确保订单返回到正确的优先级位置

## Capabilities

### Modified Capabilities
- `bot-scheduling`: 修改机器人移除行为，支持移除忙碌状态的机器人并正确处理订单回退

### New Capabilities
（无新增功能）

## Impact

- 修改 `src/controller/Bot.ts` 中的 `destroy()` 方法
- 修改 `src/controller/OrderController.ts` 中的 `removeBot()` 方法
- 可能需要更新相关测试用例