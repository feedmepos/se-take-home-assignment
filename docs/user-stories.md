# 麦当劳自动化烹饪机器人订单控制系统 – 用户故事

本用户故事文档完全基于当前仓库中的 `OrderSystem.js` 实现，确保所有 Story 均可被系统满足。



## Epic 1：订单创建与队列管理

### Story 1.1：创建普通订单

**描述**  
作为普通顾客，我希望创建普通订单后，它能按 FIFO 顺序排在所有普通订单的末尾。

**验收标准**

- 订单号全局递增
- 状态为 `PENDING`
- `normalSeq` 自增
- 排在所有 VIP 订单之后、所有 NORMAL 订单末尾
- 加入队列后自动触发调度



### Story 1.2：创建 VIP 订单

**描述**  
作为 VIP 顾客，我希望创建 VIP 订单后，它能排在所有 VIP 订单末尾，但在所有普通订单之前。

**验收标准**

- 订单号全局递增
- 状态为 `PENDING`
- `vipSeq` 自增
- 排在所有 VIP 末尾、所有 NORMAL 之前
- 若有机器人正在处理 NORMAL，则触发抢占（见 Story 2.1）



### Story 1.3：队列排序规则

**描述**  
系统必须始终保持正确的队列顺序。

**验收标准**

- VIP 全部在前，NORMAL 全部在后
- VIP 内部按 `vipSeq` FIFO
- NORMAL 内部按 `normalSeq` FIFO
- 每次订单加入或回滚后自动排序

**代码对应**：`#sortPending()`



## Epic 2：VIP 抢占 NORMAL

### Story 2.1：VIP 抢占正在处理的 NORMAL

**描述**  
作为 VIP 顾客，我希望我的订单能立即获得优先处理，即使机器人正在处理普通订单。

**验收标准**

- 若有机器人正在处理 NORMAL：
  - 取消 NORMAL 的计时器
  - NORMAL 状态恢复为 `PENDING`
  - NORMAL 插回 pending 队列（保持 FIFO）
  - VIP 立即占用该机器人
- 若没有 NORMAL 正在处理，则按正常调度处理

**代码对应**：`addOrder()` 中 VIP 分支



## Epic 3：机器人调度

### Story 3.1：增加机器人

**描述**  
作为经理，我希望增加机器人后，它能立即参与订单处理。

**验收标准**

- 新机器人状态为 `IDLE`
- 若 pending 非空，立即分配订单
- 若 pending 为空，则保持空闲



### Story 3.2：订单处理耗时 10 秒

**描述**  
机器人处理订单需要 10 秒。

**验收标准**

- 机器人状态变为 `WORKING`
- 订单状态变为 `PROCESSING`
- 10 秒后订单自动完成
- 完成后机器人恢复 `IDLE`



### Story 3.3：自动接单

**描述**  
机器人完成订单后应自动处理下一个订单。

**验收标准**

- 完成订单后自动触发 dispatch
- 若 pending 非空，立即接单
- 若 pending 为空，则保持空闲



## Epic 4：机器人删除与回滚

### Story 4.1：删除机器人（LIFO）

**描述**  
作为经理，我希望删除最新创建的机器人。

**验收标准**

- 删除 `robots.pop()`
- 若机器人空闲，直接删除
- 若机器人正在处理订单，则触发回滚（Story 4.2）



### Story 4.2：删除工作中的机器人 → 回滚订单

**描述**  
当删除正在工作的机器人时，订单必须被安全回滚。

**验收标准**

- 取消计时器
- 订单状态恢复为 `PENDING`
- 插回 pending 队列
- 重新排序（VIP FIFO + NORMAL FIFO）
- 不丢失订单，不破坏顺序



## Epic 5：订单完成与记录

### Story 5.1：订单完成进入 completed[]

**描述**  
订单完成后应进入已完成列表。

**验收标准**

- 状态变为 `DONE`
- 记录完成时间 `HH:MM:SS`
- 记录完成时间毫秒 `completedAtMs`（用于排序）
- 加入 `completed[]`



### Story 5.2：result.txt 输出

**描述**  
系统退出时应输出所有已完成订单。

**验收标准**

- 文件格式：
  ```
  Order <id> completed at <HH:MM:SS>
  ```
- 按完成时间排序
- 所有订单均输出

**代码对应**：`writeResult()`



## Epic 6：CLI 交互（可选但已实现）

### Story 6.1：支持命令

**描述**  
CLI 应支持所有核心操作。

**验收标准**

- `add normal` — 添加普通订单
- `add vip` — 添加 VIP 订单
- `add robot` — 新增机器人
- `remove robot` — 删除最新机器人
- `list pending` — 列出待处理订单
- `list completed` — 列出已完成订单
- `exit` — 退出并生成 `result.txt`



## 文档与代码一致性声明

本用户故事文档完全基于当前仓库中的 `OrderSystem.js`，所有 Story 均可被系统满足。
