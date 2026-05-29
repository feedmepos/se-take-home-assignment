## Context

当前系统中，`Bot.destroy()` 方法在机器人忙碌时会拒绝销毁请求。但根据业务需求，应该允许移除忙碌状态的机器人，并将正在处理的订单返回到 PENDING 队列的原始位置（保持 VIP/普通订单的优先级顺序）。

## Goals / Non-Goals

**Goals:**
- 修改 `Bot.destroy()` 方法，允许销毁忙碌状态的机器人
- 修改 `OrderController.removeBot()` 方法，处理订单回退逻辑
- 确保订单返回到正确的优先级位置（VIP 优先，同类型按创建时间排序）

**Non-Goals:**
- 不改变其他现有功能逻辑
- 不修改优先级队列的数据结构

## Decisions

### 机器人销毁逻辑修改

**Bot.destroy() 方法:**
- 移除对忙碌状态机器人的销毁限制
- 销毁时清理定时器，停止当前处理
- 返回当前正在处理的订单（如果有的话）

**OrderController.removeBot() 方法:**
- 接收机器人销毁时返回的订单
- 如果订单存在且状态为 processing，将其重新插入优先级队列
- 重新插入时保持订单的原始创建时间，确保正确的优先级顺序
- 触发重新分配订单给其他空闲机器人

### 订单回退机制

- 使用订单的原始创建时间（`createdAt`）作为排序依据
- VIP 订单始终排在普通订单前面
- 同类型订单按创建时间排序（先创建的在前）
- 使用 `PriorityQueue.enqueue(order)` 方法重新插入订单

## Implementation Plan

1. 修改 `Bot.destroy()` 方法：
   - 移除忙碌状态检查
   - 清理定时器
   - 返回当前订单（如果存在）

2. 修改 `OrderController.removeBot()` 方法：
   - 接收销毁结果中的订单
   - 如果订单存在，更新状态为 pending
   - 将订单重新插入优先级队列
   - 触发 `processPendingOrders()` 重新分配订单

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 订单可能被重复处理 | 在销毁机器人前停止定时器，确保不会触发完成事件 |
| 订单优先级错乱 | 使用订单原始创建时间重新插入队列 |
| 并发问题 | 确保 destroy 方法是原子操作，避免竞态条件 |