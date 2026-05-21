## MODIFIED Requirements

### Requirement: 经理权限
系统 SHALL 赋予经理角色机器人管理和活动日志查看权限。经理角色不能创建订单。

#### Scenario: 经理可管理机器人
- **WHEN** 当前角色为"经理"
- **THEN** "+ Bot" 和 "- Bot" 按钮可见且可操作

#### Scenario: 经理可查看活动日志
- **WHEN** 当前角色为"经理"
- **THEN** 活动日志面板可见，展示所有订单和机器人事件

#### Scenario: 经理不可见订单创建面板
- **WHEN** 当前角色为"经理"
- **THEN** "创建订单"面板（含 "New Normal Order" 和 "New VIP Order" 按钮）不可见

### Requirement: 角色切换
系统 SHALL 在页面顶部提供角色切换控件，支持"顾客"和"经理"两种角色。默认为"顾客"角色。

#### Scenario: 默认角色为顾客
- **WHEN** 页面首次加载
- **THEN** 当前角色为"顾客"
- **AND** 机器人管理按钮和活动日志面板不可见

#### Scenario: 切换到经理角色
- **WHEN** 用户切换角色为"经理"
- **THEN** 显示机器人管理按钮（+Bot / -Bot）和活动日志面板
- **AND** 订单创建面板不可见

#### Scenario: 从经理切换回顾客
- **WHEN** 当前为经理角色，用户切换回"顾客"
- **THEN** 机器人管理按钮和活动日志面板隐藏
- **AND** 订单创建面板重新可见
- **AND** PENDING 和 COMPLETE 区域保持不变
