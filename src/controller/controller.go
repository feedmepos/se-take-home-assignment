package controller

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Event 系统事件
type Event struct {
	Type      string
	Timestamp time.Time
	Data      interface{}
}

// EventHandler 事件处理函数
type EventHandler func(Event)

func noopHandler(Event) {}

// botEntry Bot 运行时信息
type botEntry struct {
	id        int
	current   *Order           // 正在处理的订单，nil=空闲
	cancel    context.CancelFunc
	notify    chan struct{}     // 通知 Bot goroutine 有新任务
	timer     <-chan time.Time  // 已注册的定时器
	createdAt time.Time         // Bot 创建时间
}

// SystemStatus 系统状态摘要
type SystemStatus struct {
	TotalOrders int `json:"total_orders"`
	Pending     int `json:"pending"`
	Processing  int `json:"processing"`
	Complete    int `json:"complete"`
	ActiveBots  int `json:"active_bots"`
	IdleBots    int `json:"idle_bots"`
}

// Controller 顶层控制器
type Controller struct {
	mu      sync.Mutex
	queue   *OrderQueue
	bots    map[int]*botEntry
	nextBot int
	orders  map[int]*Order
	nextID  int
	handler EventHandler
	clock   Clock
}

// NewController 创建控制器
func NewController(handler EventHandler, clk Clock) *Controller {
	if handler == nil {
		handler = noopHandler
	}
	return &Controller{
		queue:   NewOrderQueue(),
		bots:    make(map[int]*botEntry),
		orders:  make(map[int]*Order),
		nextID:  999, // ++后第一个订单是 1000
		handler: handler,
		clock:   clk,
	}
}

func (c *Controller) emit(eventType string, data interface{}) {
	c.handler(Event{Type: eventType, Timestamp: c.clock.Now(), Data: data})
}

// SetEventHandler 设置事件处理器（用于 Server 模式动态切换）
func (c *Controller) SetEventHandler(handler EventHandler) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.handler = handler
}

// NewOrder 创建新订单
func (c *Controller) NewOrder(orderType OrderType) *Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.nextID++
	order := &Order{
		ID:        c.nextID,
		Type:      orderType,
		Status:    StatusPending,
		CreatedAt: c.clock.Now(),
	}
	c.orders[order.ID] = order
	c.queue.Enqueue(order)

		c.emit("order_created", map[string]interface{}{
			"order_id":   order.ID,
			"type":       order.Type.String(),
			"status":     "PENDING",
			"created_at": order.CreatedAt.Format("15:04:05"),
		})

	c.tryDispatch()
	return order
}

// AddBot 添加 Bot
func (c *Controller) AddBot() int {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.nextBot++
	botID := c.nextBot

	ctx, cancel := context.WithCancel(context.Background())
	entry := &botEntry{id: botID, cancel: cancel, notify: make(chan struct{}, 1), createdAt: c.clock.Now()}
	c.bots[botID] = entry

	go c.runBot(ctx, entry)

		c.emit("bot_created", map[string]interface{}{
			"bot_id":     botID,
			"status":     "ACTIVE",
			"created_at": entry.createdAt.Format("15:04:05"),
		})

	c.tryDispatch()
	return botID
}

// RemoveBot 移除最新的 Bot
func (c *Controller) RemoveBot() error {
	c.mu.Lock()

	if len(c.bots) == 0 {
		c.mu.Unlock()
		return fmt.Errorf("no bots to remove")
	}

	var maxID int
	for id := range c.bots {
		if id > maxID {
			maxID = id
		}
	}

	entry := c.bots[maxID]
	returned := entry.current
	delete(c.bots, maxID)
	c.mu.Unlock()

	// 取消 Bot 的 context，使 runBot 退出
	entry.cancel()

	// 如果有正在处理的订单，回退到队列
	if returned != nil {
		returned.Status = StatusPending
		returned.BotID = 0
			returned.ProcessingAt = nil

		c.mu.Lock()
		c.queue.Return(returned)
		c.mu.Unlock()

		c.emit("order_returned", map[string]interface{}{
			"order_id": returned.ID,
			"type":     returned.Type.String(),
			"status":   "PENDING",
			"reason":   "bot_destroyed",
		})

		// 尝试重新调度
		c.mu.Lock()
		c.tryDispatch()
		c.mu.Unlock()
	}

	c.emit("bot_destroyed", map[string]interface{}{
		"bot_id": maxID,
	})

	return nil
}

// tryDispatch 尝试调度（需已持锁）
func (c *Controller) tryDispatch() {
	for {
		// 找一个空闲 Bot
		var idle *botEntry
		for _, entry := range c.bots {
			if entry.current == nil {
				idle = entry
				break
			}
		}
		if idle == nil {
			return
		}

		// 从队列取订单
		order := c.queue.Dequeue()
		if order == nil {
			return
		}

		// 分配
		idle.current = order
		order.Status = StatusProcessing
		order.BotID = idle.id
		now := c.clock.Now()
		order.ProcessingAt = &now

		// 在持锁状态下注册定时器，确保在 clock.Add 之前完成
		idle.timer = c.clock.After(10 * time.Second)

		c.emit("order_processing", map[string]interface{}{
			"order_id":     order.ID,
			"bot_id":       idle.id,
			"type":         order.Type.String(),
			"status":       "PROCESSING",
			"processing_at": order.ProcessingAt.Format("15:04:05"),
		})

		// 通知 Bot goroutine 开始处理（非阻塞）
		select {
		case idle.notify <- struct{}{}:
		default:
		}
	}
}

// runBot Bot 主循环：等待分配 → 处理订单 → 等待下一次分配
func (c *Controller) runBot(ctx context.Context, entry *botEntry) {
	for {
		// 等待被分配任务或被销毁
		select {
		case <-ctx.Done():
			return
		case <-entry.notify:
			// 收到任务分配，开始处理
		}

		order := entry.current
		if order == nil {
			continue
		}
		timer := entry.timer

		// 等待处理完成（10 秒）
		select {
		case <-ctx.Done():
			// Bot 被销毁，订单回退由 RemoveBot 处理
			return
		case <-timer:
			// 处理完成
			order.Status = StatusComplete
			order.BotID = 0
			endTime := c.clock.Now()
			order.CompletedAt = &endTime

			c.emit("order_complete", map[string]interface{}{
				"order_id":    order.ID,
				"bot_id":      entry.id,
				"type":        order.Type.String(),
				"status":      "COMPLETE",
				"completed_at": order.CompletedAt.Format("15:04:05"),
			})

			// 标记 Bot 空闲并尝试调度下一个
			c.mu.Lock()
			if _, exists := c.bots[entry.id]; exists {
				entry.current = nil
				entry.timer = nil
				c.tryDispatch()
				// tryDispatch 可能已分配新订单，检查 Bot 是否真正空闲
				if entry.current == nil {
					c.mu.Unlock()
					c.emit("bot_idle", map[string]interface{}{
						"bot_id": entry.id,
					})
				} else {
					c.mu.Unlock()
				}
			} else {
				c.mu.Unlock()
			}
		}
	}
}

// GetOrders 获取所有订单
func (c *Controller) GetOrders() []*Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	result := make([]*Order, 0, len(c.orders))
	for _, o := range c.orders {
		result = append(result, o)
	}
	return result
}

// GetBots 获取所有 Bot 信息
func (c *Controller) GetBots() []BotInfo {
	c.mu.Lock()
	defer c.mu.Unlock()

	result := make([]BotInfo, 0, len(c.bots))
	for _, entry := range c.bots {
		info := BotInfo{ID: entry.id, Status: BotIdle}
		if entry.current != nil {
			info.Status = BotProcessing
			info.CurrentOrder = entry.current
		}
		result = append(result, info)
	}
	return result
}

// GetStatus 获取系统状态摘要
func (c *Controller) GetStatus() SystemStatus {
	c.mu.Lock()
	defer c.mu.Unlock()

	var pending, processing, complete int
	for _, o := range c.orders {
		switch o.Status {
		case StatusPending:
			pending++
		case StatusProcessing:
			processing++
		case StatusComplete:
			complete++
		}
	}

	var active, idle int
	for _, entry := range c.bots {
		if entry.current != nil {
			active++
		} else {
			idle++
		}
	}

	return SystemStatus{
		TotalOrders: len(c.orders),
		Pending:     pending,
		Processing:  processing,
		Complete:    complete,
		ActiveBots:  active,
		IdleBots:    idle,
	}
}

// Reset 重置系统：清空所有订单和 Bot，重置 ID 计数器
func (c *Controller) Reset() {
	c.mu.Lock()

	// 取消所有 Bot goroutine
	for _, entry := range c.bots {
		entry.cancel()
	}

	c.orders = make(map[int]*Order)
	c.bots = make(map[int]*botEntry)
	c.queue = NewOrderQueue()
	c.nextID = 999
	c.nextBot = 0

	c.mu.Unlock()

	c.emit("system_reset", map[string]interface{}{
		"status": "reset",
	})
}

// FormatEvent 格式化事件为字符串
func FormatEvent(e Event) string {
	ts := e.Timestamp.Format("15:04:05")
	d, _ := e.Data.(map[string]interface{})

	switch e.Type {
	case "order_created":
		return fmt.Sprintf("[%s] Created %s Order #%d - Status: %s",
			ts, d["type"], d["order_id"], d["status"])
	case "order_processing":
		return fmt.Sprintf("[%s] Bot #%d picked up %s Order #%d - Status: %s",
			ts, d["bot_id"], d["type"], d["order_id"], d["status"])
	case "order_complete":
		return fmt.Sprintf("[%s] Bot #%d completed %s Order #%d - Status: %s (Processing time: 10s)",
			ts, d["bot_id"], d["type"], d["order_id"], d["status"])
	case "order_returned":
		return fmt.Sprintf("[%s] Order #%d returned - Status: %s (reason: %s)",
			ts, d["order_id"], d["status"], d["reason"])
	case "bot_created":
		return fmt.Sprintf("[%s] Bot #%d created - Status: %s",
			ts, d["bot_id"], d["status"])
	case "bot_destroyed":
		return fmt.Sprintf("[%s] Bot #%d destroyed while IDLE", ts, d["bot_id"])
	case "bot_idle":
		return fmt.Sprintf("[%s] Bot #%d is now IDLE - No pending orders",
			ts, d["bot_id"])
	case "system_reset":
		return fmt.Sprintf("[%s] System reset - All data cleared", ts)
	default:
		return fmt.Sprintf("[%s] %s: %v", ts, e.Type, e.Data)
	}
}
