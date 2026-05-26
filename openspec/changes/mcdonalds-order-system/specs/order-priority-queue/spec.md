## ADDED Requirements

### Requirement: Normal order FIFO queue
Normal 订单 SHALL 按创建时间顺序（FIFO）排列在 PENDING 队列中。

#### Scenario: Create multiple normal orders
- **WHEN** 用户连续创建 3 个 Normal 订单
- **THEN** PENDING 区域中按创建时间先后显示 3 个订单，序号递增

#### Scenario: Normal orders processed in order
- **WHEN** 存在 2 个 Normal 订单且有可用机器人
- **THEN** 先创建的订单先被取走处理

### Requirement: VIP order priority insertion
VIP 订单 SHALL 插入到所有 Normal 订单之前，但排在所有已有 VIP 订单之后。

#### Scenario: VIP order before normal orders
- **WHEN** PENDING 队列中有 2 个 Normal 订单，然后创建 1 个 VIP 订单
- **THEN** PENDING 队列顺序为：VIP-1, Normal-1, Normal-2

#### Scenario: Multiple VIP orders maintain relative order
- **WHEN** PENDING 队列中已有 1 个 VIP 订单和 1 个 Normal 订单，再创建 1 个 VIP 订单
- **THEN** PENDING 队列顺序为：VIP-1, VIP-2, Normal-1

#### Scenario: All VIP orders processed before normal orders
- **WHEN** PENDING 队列中有 VIP-1, VIP-2, Normal-1, Normal-2，有 1 个可用机器人
- **THEN** 处理顺序为：VIP-1 first, then VIP-2, then Normal-1, then Normal-2

### Requirement: Unique and increasing order ID
每个订单 SHALL 拥有全局唯一且递增的订单号。

#### Scenario: Order ID increases monotonically
- **WHEN** 创建多个订单（无论 VIP 或 Normal）
- **THEN** 每个新订单的 ID 比之前所有订单的 ID 都大
