## Why

当前系统中经理角色拥有全部权限（创建订单 + 管理机器人 + 查看日志），但业务上订单应由顾客提交，经理的职责应聚焦于后厨运营管理（机器人调度、订单处理监控）。移除经理的订单创建功能，使角色职责更清晰。

## What Changes

- **BREAKING**: 移除经理角色的订单创建权限 — 经理切换后，"创建订单"面板及其按钮不可见
- 顾客角色行为不变 — 仍然可以创建普通订单和 VIP 订单
- 现有 E2E 测试中 `manager-role` 和 `order-submission` 相关用例需同步更新
- 活动日志继续正常记录所有事件（由顾客创建的订单仍被记录）

## Capabilities

### New Capabilities

<!-- 无新增能力 -->

### Modified Capabilities

- `manager-role`: 经理权限从"全部权限"缩小为"机器人管理 + 活动日志查看"，不再包含订单创建
- `order-submission`: 订单创建从"所有角色均可"改为"仅顾客角色可创建"

## Impact

- `src/components/OrderButtons.jsx` — 需根据角色条件渲染
- `src/store/OrderContext.jsx` — `createOrder` 需增加角色校验（防御性编程）
- `tests/playwright/changes/mc-order-tracking-system/mc-order-tracking-system.spec.ts` — 更新角色权限相关测试用例
- `openspec/changes/mc-order-tracking-system/specs/manager-role/spec.md` — 更新经理权限规约
- `openspec/changes/mc-order-tracking-system/specs/order-submission/spec.md` — 更新订单创建权限规约
