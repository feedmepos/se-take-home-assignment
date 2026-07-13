package main

import (
	"fmt"
	"sync"
	"time"
)

// OrderStatus 订单状态
type OrderStatus string

const (
	StatusPending    OrderStatus = "PENDING"
	StatusProcessing OrderStatus = "PROCESSING"
	StatusComplete   OrderStatus = "COMPLETE"
)

// OrderType 订单类型
type OrderType string

const (
	OrderTypeNormal OrderType = "NORMAL"
	OrderTypeVIP    OrderType = "VIP"
)

// Order 订单结构
type Order struct {
	ID              int         `json:"id"`
	Type            OrderType   `json:"type"`
	Status          OrderStatus `json:"status"`
	CreatedAt       time.Time   `json:"created_at"`
	ProcessingAt    time.Time   `json:"processing_at,omitempty"`    // 开始处理时间
	CompletedAt     time.Time   `json:"completed_at,omitempty"`     // 完成时间
	BotID           int         `json:"bot_id,omitempty"`           // 当前处理的机器人ID
	ProcessedByBot  int         `json:"processed_by_bot,omitempty"` // 处理完成的机器人ID
}

// Bot 机器人结构
type Bot struct {
	ID           int    `json:"id"`
	CurrentOrder *Order `json:"current_order,omitempty"`
	IsIdle       bool   `json:"is_idle"`
}

// OrderSystem 订单系统
type OrderSystem struct {
	pendingVIP    []*Order
	pendingNormal []*Order
	completed     []*Order
	bots          map[int]*Bot
	nextOrderID   int
	nextBotID     int
	mu            sync.Mutex
}

// NewOrderSystem 创建新的订单系统
func NewOrderSystem() *OrderSystem {
	return &OrderSystem{
		pendingVIP:    make([]*Order, 0),
		pendingNormal: make([]*Order, 0),
		completed:     make([]*Order, 0),
		bots:          make(map[int]*Bot),
		nextOrderID:   1,
		nextBotID:     1,
	}
}

// CreateOrder 创建新订单
func (os *OrderSystem) CreateOrder(orderType OrderType) *Order {
	os.mu.Lock()
	defer os.mu.Unlock()

	order := &Order{
		ID:        os.nextOrderID,
		Type:      orderType,
		Status:    StatusPending,
		CreatedAt: time.Now(),
	}
	os.nextOrderID++

	// 根据订单类型添加到相应的队列
	if orderType == OrderTypeVIP {
		os.pendingVIP = append(os.pendingVIP, order)
	} else {
		os.pendingNormal = append(os.pendingNormal, order)
	}

	// 尝试分配给空闲机器人
	os.assignOrdersToIdleBots()

	return order
}

// CreateBot 创建新机器人
func (os *OrderSystem) CreateBot() *Bot {
	os.mu.Lock()
	defer os.mu.Unlock()

	bot := &Bot{
		ID:     os.nextBotID,
		IsIdle: true,
	}
	os.nextBotID++
	os.bots[bot.ID] = bot

	// 尝试分配订单给新机器人
	os.assignOrdersToIdleBots()

	return bot
}

// RemoveBot 移除最新的机器人
func (os *OrderSystem) RemoveBot() bool {
	os.mu.Lock()
	defer os.mu.Unlock()

	if len(os.bots) == 0 {
		return false
	}

	// 找到最新的机器人（ID最大的）
	var newestBot *Bot
	for _, bot := range os.bots {
		if newestBot == nil || bot.ID > newestBot.ID {
			newestBot = bot
		}
	}

	// 如果机器人正在处理订单，将订单返回到待处理队列
	if newestBot.CurrentOrder != nil {
		order := newestBot.CurrentOrder
		order.Status = StatusPending
		order.BotID = 0
		newestBot.CurrentOrder = nil

		// 根据订单类型返回到相应队列的前面（保持VIP/普通订单优先级）
		if order.Type == OrderTypeVIP {
			os.pendingVIP = append([]*Order{order}, os.pendingVIP...)
		} else {
			os.pendingNormal = append([]*Order{order}, os.pendingNormal...)
		}
	}

	// 从bots map中删除
	delete(os.bots, newestBot.ID)

	return true
}

// assignOrdersToIdleBots 将订单分配给空闲机器人（内部方法，调用时已持有锁）
func (os *OrderSystem) assignOrdersToIdleBots() {
	for _, bot := range os.bots {
		if bot.IsIdle && bot.CurrentOrder == nil {
			order := os.getNextPendingOrder()
			if order != nil {
				bot.CurrentOrder = order
				bot.IsIdle = false
				order.Status = StatusProcessing
				order.BotID = bot.ID

				// 启动goroutine处理订单
				go os.processOrder(bot, order)
			}
		}
	}
}

// getNextPendingOrder 获取下一个待处理订单（VIP优先）
func (os *OrderSystem) getNextPendingOrder() *Order {
	// 优先处理VIP订单
	if len(os.pendingVIP) > 0 {
		order := os.pendingVIP[0]
		os.pendingVIP = os.pendingVIP[1:]
		return order
	}

	// 然后处理普通订单
	if len(os.pendingNormal) > 0 {
		order := os.pendingNormal[0]
		os.pendingNormal = os.pendingNormal[1:]
		return order
	}

	return nil
}

// processOrder 处理订单（10秒后完成）
func (os *OrderSystem) processOrder(bot *Bot, order *Order) {
	// 记录开始处理时间
	os.mu.Lock()
	order.ProcessingAt = time.Now()
	order.ProcessedByBot = bot.ID
	os.mu.Unlock()

	// 处理订单需要10秒
	time.Sleep(10 * time.Second)

	os.mu.Lock()
	defer os.mu.Unlock()

	// 检查订单是否还在被这个机器人处理（可能已被取消）
	if bot.CurrentOrder == order {
		order.Status = StatusComplete
		order.CompletedAt = time.Now()
		order.BotID = 0
		os.completed = append(os.completed, order)
		bot.CurrentOrder = nil
		bot.IsIdle = true

		// 继续处理下一个订单
		os.assignOrdersToIdleBots()
	}
}

// GetStats 获取系统统计信息
func (os *OrderSystem) GetStats() map[string]int {
	os.mu.Lock()
	defer os.mu.Unlock()

	return map[string]int{
		"pending_vip":    len(os.pendingVIP),
		"pending_normal": len(os.pendingNormal),
		"completed":      len(os.completed),
		"bots_total":     len(os.bots),
		"bots_idle":      os.countIdleBots(),
		"bots_working":   os.countWorkingBots(),
	}
}

// countIdleBots 统计空闲机器人数量（内部方法，调用时已持有锁）
func (os *OrderSystem) countIdleBots() int {
	count := 0
	for _, bot := range os.bots {
		if bot.IsIdle {
			count++
		}
	}
	return count
}

// countWorkingBots 统计工作机器人数量（内部方法，调用时已持有锁）
func (os *OrderSystem) countWorkingBots() int {
	return len(os.bots) - os.countIdleBots()
}

// GetAllPendingOrders 获取所有待处理订单
func (os *OrderSystem) GetAllPendingOrders() []*Order {
	os.mu.Lock()
	defer os.mu.Unlock()

	all := make([]*Order, 0, len(os.pendingVIP)+len(os.pendingNormal))
	all = append(all, os.pendingVIP...)
	all = append(all, os.pendingNormal...)
	return all
}

// GetAllCompletedOrders 获取所有已完成订单
func (os *OrderSystem) GetAllCompletedOrders() []*Order {
	os.mu.Lock()
	defer os.mu.Unlock()

	return os.completed
}

// GetAllBots 获取所有机器人
func (os *OrderSystem) GetAllBots() []*Bot {
	os.mu.Lock()
	defer os.mu.Unlock()

	bots := make([]*Bot, 0, len(os.bots))
	for _, bot := range os.bots {
		bots = append(bots, bot)
	}
	return bots
}

// FormatTime 格式化时间为HH:MM:SS
func FormatTime(t time.Time) string {
	return t.Format("15:04:05")
}

// PrintResult 打印结果到result.txt格式
func (os *OrderSystem) PrintResult() string {
	os.mu.Lock()
	defer os.mu.Unlock()

	result := ""
	result += "=== McDonald's Order Management System ===\n\n"

	// 统计信息
	stats := map[string]int{
		"pending_vip":    len(os.pendingVIP),
		"pending_normal": len(os.pendingNormal),
		"completed":      len(os.completed),
		"bots_total":     len(os.bots),
		"bots_idle":      os.countIdleBots(),
		"bots_working":   os.countWorkingBots(),
	}
	result += fmt.Sprintf("Time: %s\n", FormatTime(time.Now()))
	result += fmt.Sprintf("Pending Orders: VIP=%d, Normal=%d\n", stats["pending_vip"], stats["pending_normal"])
	result += fmt.Sprintf("Completed Orders: %d\n", stats["completed"])
	result += fmt.Sprintf("Bots: Total=%d, Idle=%d, Working=%d\n\n", stats["bots_total"], stats["bots_idle"], stats["bots_working"])

	// 待处理订单
	result += "--- Pending Orders ---\n"
	pending := make([]*Order, 0, len(os.pendingVIP)+len(os.pendingNormal))
	pending = append(pending, os.pendingVIP...)
	pending = append(pending, os.pendingNormal...)
	if len(pending) == 0 {
		result += "No pending orders\n"
	} else {
		for _, order := range pending {
			result += fmt.Sprintf("[%s] Order #%d (%s) - Created at %s\n",
				FormatTime(order.CreatedAt), order.ID, order.Type, FormatTime(order.CreatedAt))
			if !order.ProcessingAt.IsZero() {
				result += fmt.Sprintf("       Processing started at %s by Bot #%d\n",
					FormatTime(order.ProcessingAt), order.BotID)
			}
		}
	}
	result += "\n"

	// 已完成订单
	result += "--- Completed Orders ---\n"
	if len(os.completed) == 0 {
		result += "No completed orders\n"
	} else {
		for _, order := range os.completed {
			result += fmt.Sprintf("[%s] Order #%d (%s)\n",
				FormatTime(order.CreatedAt), order.ID, order.Type)
			result += fmt.Sprintf("       Created: %s\n", FormatTime(order.CreatedAt))
			if !order.ProcessingAt.IsZero() {
				result += fmt.Sprintf("       Started: %s (by Bot #%d)\n",
					FormatTime(order.ProcessingAt), order.ProcessedByBot)
			}
			if !order.CompletedAt.IsZero() {
				result += fmt.Sprintf("       Finished: %s\n", FormatTime(order.CompletedAt))
			}
		}
	}
	result += "\n"

	// 机器人状态
	result += "--- Bots ---\n"
	bots := make([]*Bot, 0, len(os.bots))
	for _, bot := range os.bots {
		bots = append(bots, bot)
	}
	if len(bots) == 0 {
		result += "No bots\n"
	} else {
		for _, bot := range bots {
			if bot.IsIdle {
				result += fmt.Sprintf("Bot #%d: IDLE\n", bot.ID)
			} else if bot.CurrentOrder != nil {
				result += fmt.Sprintf("Bot #%d: Processing Order #%d\n", bot.ID, bot.CurrentOrder.ID)
			}
		}
	}

	return result
}
