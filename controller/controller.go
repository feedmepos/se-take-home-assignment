package controller

import (
	"fmt"
	"sync"
	"time"

	"mcdonalds-order-controller/model"
)

// botWorker 机器人及其运行时状态
type botWorker struct {
	bot      *model.Bot
	order    *model.Order  // nil 表示空闲
	stopChan chan struct{} // 关闭此通道终止处理
}

// Controller 管理订单队列和机器人池
type Controller struct {
	vipQueue      []*model.Order
	normalQueue   []*model.Order
	completeQueue []*model.Order
	bots          []*botWorker
	orderSeq      int
	botSeq        int
	mu            sync.Mutex
	logger        func(format string, args ...interface{})
}

// New 创建 Controller 实例
func New(logger func(format string, args ...interface{})) *Controller {
	return &Controller{
		logger: logger,
	}
}

// log 带时间戳的日志输出
func (c *Controller) log(format string, args ...interface{}) {
	ts := time.Now().Format("15:04:05")
	msg := fmt.Sprintf(format, args...)
	c.logger("[%s] %s", ts, msg)
}

// AddOrder 新增订单并入队
func (c *Controller) AddOrder(orderType model.OrderType) *model.Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.orderSeq++
	order := &model.Order{
		ID:     c.orderSeq,
		Type:   orderType,
		Status: model.Pending,
	}

	c.enqueue(order)

	if orderType == model.VIP {
		c.log("新增 VIP 订单 #%d → 等待中", order.ID)
	} else {
		c.log("新增普通订单 #%d → 等待中", order.ID)
	}

	c.dispatch()
	return order
}

// AddBot 新增机器人，有待处理订单则立即领取
func (c *Controller) AddBot() *botWorker {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.botSeq++
	worker := &botWorker{
		bot:      &model.Bot{ID: c.botSeq},
		stopChan: make(chan struct{}),
	}
	c.bots = append(c.bots, worker)
	c.log("+ 机器人 #%d 已创建 → 空闲", worker.bot.ID)

	// 优先领取待处理订单
	order := c.dequeue()
	if order != nil {
		worker.order = order
		order.Status = model.Processing
		c.log("机器人 #%d 领取订单 #%d [%s] → 处理中", worker.bot.ID, order.ID, order.Type)
		go c.processOrder(worker, order)
	}
	return worker
}

// RemoveBot 销毁最新机器人，其正在处理的订单返回队列头部
func (c *Controller) RemoveBot() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.bots) == 0 {
		c.log("没有可移除的机器人")
		return
	}

	// 移除最新机器人
	last := len(c.bots) - 1
	worker := c.bots[last]
	c.bots = c.bots[:last]

	// 通知协程停止
	close(worker.stopChan)

	if worker.order != nil {
		order := worker.order
		worker.order = nil
		// 订单返回队列头部，保持优先级
		c.requeueToHead(order)
		c.log("- 机器人 #%d 已销毁 → 订单 #%d 返回等待中（队列头部）", worker.bot.ID, order.ID)
	} else {
		c.log("- 机器人 #%d 已销毁 → 原为空闲状态", worker.bot.ID)
	}
}

// PrintStatus 打印当前所有订单和机器人状态
func (c *Controller) PrintStatus() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.log("=== 状态总览 ===")

	// PENDING：VIP 优先，再普通
	pending := append(c.vipQueue, c.normalQueue...)
	if len(pending) == 0 {
		c.log("PENDING: (无)")
	} else {
		for _, o := range pending {
			c.log("PENDING: 订单 #%d [%s]", o.ID, o.Type)
		}
	}

	// 机器人状态
	if len(c.bots) == 0 {
		c.log("机器人: (无)")
	} else {
		for _, w := range c.bots {
			if w.order != nil {
				c.log("机器人 #%d → 处理中 订单 #%d [%s]", w.bot.ID, w.order.ID, w.order.Type)
			} else {
				c.log("机器人 #%d → 空闲", w.bot.ID)
			}
		}
	}

	// COMPLETE
	if len(c.completeQueue) == 0 {
		c.log("COMPLETE: (无)")
	} else {
		for _, o := range c.completeQueue {
			c.log("COMPLETE: 订单 #%d [%s]", o.ID, o.Type)
		}
	}

	c.log("=== 状态结束 ===")
}

// enqueue 按类型入队尾部
func (c *Controller) enqueue(order *model.Order) {
	if order.Type == model.VIP {
		c.vipQueue = append(c.vipQueue, order)
	} else {
		c.normalQueue = append(c.normalQueue, order)
	}
}

// dequeue VIP 优先出队
func (c *Controller) dequeue() *model.Order {
	if len(c.vipQueue) > 0 {
		order := c.vipQueue[0]
		c.vipQueue = c.vipQueue[1:]
		return order
	}
	if len(c.normalQueue) > 0 {
		order := c.normalQueue[0]
		c.normalQueue = c.normalQueue[1:]
		return order
	}
	return nil
}

// requeueToHead 将订单重新插入队列头部
func (c *Controller) requeueToHead(order *model.Order) {
	order.Status = model.Pending
	if order.Type == model.VIP {
		c.vipQueue = append([]*model.Order{order}, c.vipQueue...)
	} else {
		c.normalQueue = append([]*model.Order{order}, c.normalQueue...)
	}
}

// dispatch 分配待处理订单给空闲机器人，须持有 c.mu
func (c *Controller) dispatch() {
	for i := 0; i < len(c.bots); i++ {
		worker := c.bots[i]
		if worker.order != nil {
			continue // 忙碌中
		}
		order := c.dequeue()
		if order == nil {
			break // 无待处理订单
		}
		worker.order = order
		order.Status = model.Processing
		c.log("机器人 #%d 领取订单 #%d [%s] → 处理中", worker.bot.ID, order.ID, order.Type)
		go c.processOrder(worker, order)
	}
}

// processOrder 模拟 10 秒处理订单
func (c *Controller) processOrder(worker *botWorker, order *model.Order) {
	select {
	case <-time.After(10 * time.Second):
		c.mu.Lock()
		defer c.mu.Unlock()

		order.Status = model.Complete
		worker.order = nil
		c.completeQueue = append(c.completeQueue, order)
		c.log("机器人 #%d 完成订单 #%d → 已完成", worker.bot.ID, order.ID)

		// 继续领取下一个订单
		c.dispatch()

	case <-worker.stopChan:
		// 机器人已销毁，RemoveBot 负责订单重新入队
		return
	}
}

// PendingCount 待处理订单总数
func (c *Controller) PendingCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.vipQueue) + len(c.normalQueue)
}

// VipQueueSnapshot VIP 队列快照
func (c *Controller) VipQueueSnapshot() []*model.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	result := make([]*model.Order, len(c.vipQueue))
	copy(result, c.vipQueue)
	return result
}

// NormalQueueSnapshot 普通队列快照
func (c *Controller) NormalQueueSnapshot() []*model.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	result := make([]*model.Order, len(c.normalQueue))
	copy(result, c.normalQueue)
	return result
}

// CompleteSnapshot 已完成订单快照
func (c *Controller) CompleteSnapshot() []*model.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	result := make([]*model.Order, len(c.completeQueue))
	copy(result, c.completeQueue)
	return result
}

// BotCount 活跃机器人数量
func (c *Controller) BotCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.bots)
}
