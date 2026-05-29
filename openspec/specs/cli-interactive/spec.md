## ADDED Requirements

### Requirement: Interactive UI Display
系统 SHALL 提供基于 Ink + React 的交互界面，显示订单和机器人状态。

#### Scenario: 界面布局正确
- **WHEN** 用户启动交互模式
- **THEN** 界面显示：顶部操作按钮区、PENDING ORDERS 区、COOKING BOTS 区、COMPLETED ORDERS 区

#### Scenario: 操作说明提示
- **WHEN** 用户启动交互模式
- **THEN** 界面显示操作说明：使用 Tab 键导航，Enter/Space 键触发按钮

### Requirement: Interactive Buttons
系统 SHALL 提供操作按钮，用户可通过按钮进行交互。

#### Scenario: 按钮功能正常
- **WHEN** 用户点击 "New Normal Order" 按钮
- **THEN** 创建普通订单

- **WHEN** 用户点击 "New VIP Order" 按钮
- **THEN** 创建 VIP 订单

- **WHEN** 用户点击 "Add Bot" 按钮
- **THEN** 添加新机器人

- **WHEN** 用户点击 "Remove Bot" 按钮
- **THEN** 移除最新的机器人

- **WHEN** 用户点击 "Exit" 按钮
- **THEN** 退出程序

### Requirement: Real-time UI Updates
系统 SHALL 实时更新界面，反映订单和机器人状态变化。

#### Scenario: 界面自动更新
- **WHEN** 订单状态变化或机器人状态变化
- **THEN** 界面立即更新显示最新状态
