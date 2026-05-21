## Context

当前系统通过 `state.role` 控制角色权限。`BotManager` 已通过 `isManager` 条件渲染实现了经理/顾客差异化（+/- Bot 按钮仅经理可见）。但 `OrderButtons` 未使用角色条件，所有角色均可创建订单。此次变更将同样的条件渲染模式应用于 `OrderButtons`，实现"仅顾客可见订单创建功能"。

## Goals / Non-Goals

**Goals:**
- 经理角色下隐藏整个"创建订单"面板（含 Normal 和 VIP 按钮）
- `createOrder` 函数内增加角色校验，经理调用时静默忽略（防御性编程）
- 更新 E2E 测试以反映新的权限边界
- 更新 `manager-role` 和 `order-submission` 规约文档

**Non-Goals:**
- 不改变订单队列、机器人调度、活动日志等其他逻辑
- 不改变顾客角色的任何行为
- 不引入新的角色类型

## Decisions

1. **条件渲染方式**：复用 `BotManager` 已有的 `state.role !== 'customer'` 模式。在 `OrderButtons` 中判断 `state.role === 'customer'`，经理角色时返回 null（整个面板不渲染），与 BotManager 隐藏按钮的逻辑一致。

2. **Context 层防御**：在 `createOrder` 回调中增加 `state.role !== 'customer'` 提前 return，防止通过其他途径（如浏览器控制台）绕过 UI 层直接调用。

3. **E2E 测试调整**：
   - `manager-role` 规约中"切换到经理角色后显示管理界面"场景的 `AND 订单创建按钮仍然可用` → `AND 订单创建面板不可见`
   - `order-submission` 规约中"经理也可以创建订单"测试 → 改为验证"经理不可见创建订单面板"
   - 新增"经理无法创建订单"测试用例

## Risks / Trade-offs

- **BREAKING 变更**：如果存在依赖经理可创建订单的外部流程或文档，需要同步更新。当前项目为前端原型，无外部依赖，影响可控。
- **防御性校验的静默忽略**：`createOrder` 在经理角色时静默 return，不会抛出错误或提示。这符合现有 BotManager 的模式（顾客点击不了 +/- Bot，所以不需要提示）。
