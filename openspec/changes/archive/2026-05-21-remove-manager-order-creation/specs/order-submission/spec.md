## MODIFIED Requirements

### Requirement: 仅顾客可创建订单
系统 SHALL 仅允许顾客角色创建订单，经理角色不可见、不可调用订单创建功能。

#### Scenario: 顾客创建订单
- **WHEN** 当前角色为"顾客"且点击 "New Normal Order"
- **THEN** 订单正常创建，显示在 PENDING 区域

#### Scenario: 经理不可见创建订单按钮
- **WHEN** 当前角色为"经理"
- **THEN** "New Normal Order" 和 "New VIP Order" 按钮均不可见
- **AND** "创建订单"面板标题不可见
