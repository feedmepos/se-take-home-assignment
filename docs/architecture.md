# 麦当劳自动化烹饪机器人订单控制系统 – 架构设计文档

本架构文档基于当前仓库实现（尤其是 `OrderSystem` 相关代码），描述系统的模块划分、数据结构、调度与回滚算法，以及关键设计取舍。



## 1. 总体架构概览

系统是一个 **内存型订单调度系统**，核心由三部分组成：

- **OrderSystem**：领域核心，负责订单队列、机器人列表、调度与回滚。
- **Robot Workers**：由 OrderSystem 管理的“工作单元”，执行订单处理。
- **CLI 层**：提供命令行交互（创建订单、增减机器人、查看状态、退出并生成 `result.txt`）。

### 1.1 模块关系图

```text
+---------------------------+
|         CLI 层            |
|  - 命令解析               |
|  - 状态展示               |
|  - 退出 & 写 result.txt   |
+-------------+-------------+
              |
              v
+---------------------------+
|       OrderSystem         |
|---------------------------|
| - pending[]               |
| - completed[]             |
| - robots[]                |
| - nextOrderId             |
| - nextRobotId             |
| - addOrder()              |
| - addRobot()              |
| - removeRobot()           |
| - #dispatch()             |
| - #startProcessing()      |
| - writeResult()           |
+-------------+-------------+
              |
              v
+---------------------------+
|       Robot Workers       |
|  - IDLE / WORKING         |
|  - currentOrder           |
|  - timer (setTimeout)     |
+---------------------------+
```



## 2. 领域模型与数据结构

### 2.1 Order 模型

```ts
type OrderType = 'VIP' | 'NORMAL';
type OrderStatus = 'PENDING' | 'PROCESSING' | 'DONE';

interface Order {
  id: number;                 // 全局递增 ID
  type: OrderType;            // VIP / NORMAL
  status: OrderStatus;        // 当前状态
  createdAt: string;          // ISO 时间戳
  completedAt: string | null; // HH:MM:SS，完成时赋值
  completedAtMs: number | null; // 完成时间毫秒，用于排序输出
  vipSeq: number | null;      // VIP 组内序号（FIFO）
  normalSeq: number | null;   // NORMAL 组内序号（FIFO）
  assignedRobotId: number | null;
  timer: NodeJS.Timeout | null;
}
```

**设计要点：**

- 使用 `vipSeq` / `normalSeq` 明确组内顺序，便于排序与回滚后保持 FIFO。
- `completedAtMs` 用于 `result.txt` 输出时按完成时间排序，避免字符串比较误差。
- `assignedRobotId` 与 `timer` 便于中断、回滚和调试。



### 2.2 Robot 模型

```ts
type RobotStatus = 'IDLE' | 'WORKING';

interface Robot {
  id: number;                 // 自增 ID
  status: RobotStatus;        // IDLE / WORKING
  currentOrderId: number | null;
  currentOrder: Order | null;
  timer: NodeJS.Timeout | null;
}
```

**设计要点：**

- `currentOrder` 保留引用，便于在抢占或删除机器人时快速访问订单。
- `timer` 用于取消正在进行的 10 秒处理（抢占 / 删除机器人时）。



### 2.3 OrderSystem 状态

```ts
class OrderSystem {
  private pending: Order[] = [];      // 待处理队列
  private completed: Order[] = [];    // 已完成订单
  private robots: Robot[] = [];       // 机器人列表（按创建顺序）
  private nextOrderId = 1;
  private nextRobotId = 1;

  // ...
}
```



## 3. 队列与优先级设计

### 3.1 排序规则

`pending[]` 队列的排序规则：

1. 所有 VIP 在前。
2. 所有 NORMAL 在后。
3. VIP 内部按 `vipSeq` 升序（FIFO）。
4. NORMAL 内部按 `normalSeq` 升序（FIFO）。

伪代码：

```ts
private sortPending() {
  this.pending.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'VIP' ? -1 : 1;
    }
    if (a.type === 'VIP') {
      return (a.vipSeq ?? 0) - (b.vipSeq ?? 0);
    }
    return (a.normalSeq ?? 0) - (b.normalSeq ?? 0);
  });
}
```

**设计理由：**

- 使用单一数组 `pending[]`，通过排序保证优先级与 FIFO，而不是维护两个独立队列。
- `vipSeq` / `normalSeq` 只在插入时递增，避免频繁重排时丢失相对顺序。



### 3.2 订单插入策略

- **NORMAL 订单：**
  - `id = nextOrderId++`
  - `normalSeq = 自增`
  - `status = PENDING`
  - `pending.push(order)`
  - `sortPending()`
  - `dispatch()`
- **VIP 订单：**
  - `id = nextOrderId++`
  - `vipSeq = 自增`
  - `status = PENDING`
  - 若有机器人正在处理 NORMAL → 触发抢占（见 4.2）
  - 否则 `pending.push(order)` + `sortPending()` + `dispatch()`



## 4. 调度与抢占算法

### 4.1 调度算法（dispatch）

调度在以下时机触发：

- 新订单加入
- 订单完成
- 回滚订单加入 pending
- 新机器人加入

伪代码：

```ts
private dispatch() {
  for (const robot of this.robots) {
    if (robot.status === 'IDLE' && this.pending.length > 0) {
      const order = this.pending.shift()!;
      this.startProcessing(robot, order);
    }
  }
}
```

**特性：**

- 简单直接：遍历所有机器人，给空闲机器人分配队头订单。
- 保证：在任何状态变化后，系统都会尝试“填满”所有空闲机器人。



### 4.2 VIP 抢占 NORMAL

当添加 VIP 订单时：

1. 查找是否有机器人正在处理 NORMAL：

   ```ts
   const workingNormalRobot = this.robots.find(
     (r) => r.status === 'WORKING' && r.currentOrder?.type === 'NORMAL'
   );
   ```

2. 若存在：

   - 取消 NORMAL 的计时器。
   - 将 NORMAL 状态改回 `PENDING`。
   - 将 NORMAL 插回 `pending[]`，再 `sortPending()`。
   - 让该机器人立即处理新 VIP 订单。

3. 若不存在：

   - VIP 按普通插入逻辑加入 `pending[]`，再 `dispatch()`。

**设计取舍：**

- 抢占只针对 NORMAL，不会抢占正在处理的 VIP。
- 抢占优先使用“正在处理 NORMAL 的机器人”，而不是等待空闲机器人。



## 5. 订单处理与完成

### 5.1 开始处理订单

```ts
private startProcessing(robot: Robot, order: Order) {
  robot.status = 'WORKING';
  robot.currentOrder = order;
  robot.currentOrderId = order.id;

  order.status = 'PROCESSING';
  order.assignedRobotId = robot.id;

  const timer = setTimeout(() => {
    this.completeOrder(robot, order);
  }, 10_000);

  robot.timer = timer;
  order.timer = timer;
}
```

### 5.2 完成订单

```ts
private completeOrder(robot: Robot, order: Order) {
  const now = new Date();
  order.status = 'DONE';
  order.completedAt = formatToHHMMSS(now);
  order.completedAtMs = now.getTime();

  robot.status = 'IDLE';
  robot.currentOrder = null;
  robot.currentOrderId = null;
  robot.timer = null;
  order.timer = null;
  order.assignedRobotId = null;

  this.completed.push(order);
  this.dispatch();
}
```

**设计要点：**

- 完成后立即触发 `dispatch()`，保证流水线持续运转。
- 使用 `completedAtMs` 作为排序依据，避免字符串时间比较问题。



## 6. 机器人删除与回滚

### 6.1 删除机器人（LIFO）

```ts
removeRobot() {
  if (this.robots.length === 0) return;
  const robot = this.robots.pop()!;
  if (robot.status === 'WORKING' && robot.currentOrder) {
    this.rollbackOrder(robot.currentOrder, robot);
  }
}
```

**设计要点：**

- 使用 LIFO（后进先出）删除机器人，符合“删除最新创建”的业务要求。
- 若机器人空闲，直接删除；若在工作，则触发回滚。



### 6.2 回滚订单

```ts
private rollbackOrder(order: Order, robot: Robot) {
  if (robot.timer) clearTimeout(robot.timer);
  robot.status = 'IDLE';
  robot.currentOrder = null;
  robot.currentOrderId = null;
  robot.timer = null;

  order.status = 'PENDING';
  order.assignedRobotId = null;
  order.timer = null;

  this.pending.push(order);
  this.sortPending();
  this.dispatch();
}
```

**设计要点：**

- 回滚后重新插入 `pending[]`，通过 `vipSeq` / `normalSeq` 保证 FIFO。
- 回滚后立即触发 `dispatch()`，让其他机器人有机会接手该订单。



## 7. result.txt 输出设计

在 CLI 退出时调用 `writeResult()`：

- 按 `completedAtMs` 升序排序 `completed[]`。

- 输出格式：

  ```text
  Order <id> completed at <HH:MM:SS>
  ```

- 写入 `result.txt`，供自动化检查使用。



## 8. 复杂度与扩展性

### 8.1 时间复杂度

- 插入订单：`O(1)` + 排序 `O(n log n)`（n 为 pending 长度）。
- 调度：遍历机器人 `O(r)`（r 为机器人数量）。
- 回滚：插入 + 排序 `O(n log n)`。

在当前作业规模下（订单与机器人数量有限），该复杂度完全可接受，且实现简单、可读性高。

### 8.2 可扩展方向

- 将 `pending[]` 拆分为 `vipQueue` + `normalQueue`，减少排序开销。
- 将 `OrderSystem` 抽象为可持久化版本（接入数据库）。
- 将 CLI 替换为 HTTP API 或前端界面。



## 9. 设计总结

本系统的设计目标是：

- **行为清晰**：VIP 优先、抢占、回滚、FIFO 都有明确规则。
- **实现简单**：使用单一 pending 队列 + 排序，而非复杂数据结构。
- **易于测试**：核心逻辑集中在 `OrderSystem` 内，便于单元测试。
- **易于展示**：CLI + result.txt + 文档，使整个系统非常适合作为面试作业展示。

本架构文档与当前代码实现保持一致，可作为后续维护与扩展的参考基础。