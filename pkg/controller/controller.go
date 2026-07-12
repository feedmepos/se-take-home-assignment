package controller

import (
	"fmt"
	"sync"
	"time"
)

// 每个订单的烹饪耗时
const orderProcessDuration = 10 * time.Second

// OrderController 管理整个订单处理系统，包括订单创建、队列调度与机器人生命周期。
// 所有公开方法均通过 Mutex 保证并发安全。
type OrderController struct {
	mu                 sync.Mutex
	orders             []*Order
	pendingQueue       PendingQueue
	completedOrders    []*Order
	bots               []*Bot
	nextOrderID        int
	nextBotID          int
	totalOrdersCreated int
}

// NewOrderController 创建一个新的订单控制器。
func NewOrderController() *OrderController {
	return &OrderController{
		orders:          make([]*Order, 0),
		completedOrders: make([]*Order, 0),
		bots:            make([]*Bot, 0),
		nextOrderID:     1,
		nextBotID:       1,
	}
}

// LogWithTimestamp 以 HH:MM:SS 格式打印带时间戳的日志。
func (oc *OrderController) LogWithTimestamp(message string) {
	timestamp := time.Now().Format("15:04:05")
	fmt.Printf("[%s] %s\n", timestamp, message)
}

// CreateNormalOrder 创建一个普通订单并加入待处理队列末尾。
func (oc *OrderController) CreateNormalOrder() *Order {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order := &Order{
		ID:       oc.nextOrderID,
		Type:     Normal,
		Status:   StatusPending,
		CreateAt: time.Now(),
	}
	oc.nextOrderID++
	oc.totalOrdersCreated++
	oc.orders = append(oc.orders, order)
	oc.pendingQueue.AddNormal(order)

	oc.LogWithTimestamp(fmt.Sprintf("Created Normal Order #%d - Status: PENDING", order.ID))
	oc.tryAssignOrderToBot()

	return order
}

// CreateVIPOrder 创建一个 VIP 订单，优先排在所有普通订单之前。
func (oc *OrderController) CreateVIPOrder() *Order {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order := &Order{
		ID:       oc.nextOrderID,
		Type:     VIP,
		Status:   StatusPending,
		CreateAt: time.Now(),
	}
	oc.nextOrderID++
	oc.totalOrdersCreated++
	oc.orders = append(oc.orders, order)
	oc.pendingQueue.AddVIP(order)

	oc.LogWithTimestamp(fmt.Sprintf("Created VIP Order #%d - Status: PENDING", order.ID))
	oc.tryAssignOrderToBot()

	return order
}

// AddBot 新增一个烹饪机器人，并立即尝试领取待处理订单。
func (oc *OrderController) AddBot() *Bot {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	bot := &Bot{
		ID:           oc.nextBotID,
		Status:       Idle,
		stopChannel:  make(chan bool, 1),
		processingWg: &sync.WaitGroup{},
	}
	oc.nextBotID++
	oc.bots = append(oc.bots, bot)

	oc.LogWithTimestamp(fmt.Sprintf("Bot #%d created - Status: ACTIVE", bot.ID))
	oc.tryAssignOrderToBot()

	return bot
}

// RemoveBot 移除最新加入的机器人。若该机器人正在处理订单，
// 订单将按其类型重新放回待处理队列并保持 VIP 优先。
func (oc *OrderController) RemoveBot() *Bot {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.bots) == 0 {
		return nil
	}

	botIndex := len(oc.bots) - 1
	bot := oc.bots[botIndex]

	if bot.Status == Processing {
		// 通知处理协程停止
		select {
		case bot.stopChannel <- true:
		default:
		}

		// 将被中断的订单放回待处理队列，保持 VIP 优先级
		if bot.CurrentOrder != nil {
			bot.CurrentOrder.Status = StatusPending
			oc.pendingQueue.ReturnOrder(bot.CurrentOrder)
		}
		oc.LogWithTimestamp(fmt.Sprintf("Bot #%d destroyed while PROCESSING", bot.ID))
	} else {
		oc.LogWithTimestamp(fmt.Sprintf("Bot #%d destroyed while IDLE", bot.ID))
	}

	oc.bots = oc.bots[:botIndex]
	return bot
}

// tryAssignOrderToBot 尝试将队首订单分配给一个空闲机器人。
// 调用方必须已持有 oc.mu 写锁。
func (oc *OrderController) tryAssignOrderToBot() {
	if oc.pendingQueue.Len() == 0 {
		return
	}

	for _, bot := range oc.bots {
		if bot.Status != Idle {
			continue
		}

		order := oc.pendingQueue.Dequeue()
		bot.CurrentOrder = order
		bot.Status = Processing
		order.Status = StatusProcessing

		orderType := "Normal"
		if order.Type == VIP {
			orderType = "VIP"
		}
		oc.LogWithTimestamp(fmt.Sprintf("Bot #%d picked up %s Order #%d - Status: PROCESSING", bot.ID, orderType, order.ID))

		go oc.processOrder(bot, order)
		return
	}
}

// processOrder 模拟 10 秒烹饪过程，完成后将订单移入完成区并尝试领取下一单。
// 若中途收到停止信号，则直接退出，订单已被 RemoveBot 放回队列。
func (oc *OrderController) processOrder(bot *Bot, order *Order) {
	bot.processingWg.Add(1)
	defer bot.processingWg.Done()

	startTime := time.Now()

	select {
	case <-time.After(orderProcessDuration):
		// 订单正常完成
		oc.mu.Lock()
		order.Status = StatusComplete
		oc.completedOrders = append(oc.completedOrders, order)
		bot.CurrentOrder = nil
		bot.Status = Idle

		processingTime := time.Since(startTime)
		orderType := "Normal"
		if order.Type == VIP {
			orderType = "VIP"
		}
		oc.LogWithTimestamp(fmt.Sprintf("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %ds)",
			bot.ID, orderType, order.ID, int(processingTime.Seconds())))

		oc.tryAssignOrderToBot()
		if bot.Status == Idle && oc.pendingQueue.Len() == 0 {
			oc.LogWithTimestamp(fmt.Sprintf("Bot #%d is now IDLE - No pending orders", bot.ID))
		}
		oc.mu.Unlock()

	case <-bot.stopChannel:
		// 机器人被移除，订单已由 RemoveBot 放回队列，这里仅清理机器人状态
		oc.mu.Lock()
		bot.CurrentOrder = nil
		bot.Status = Idle
		oc.mu.Unlock()
	}
}

// PrintStatus 打印当前系统的订单与机器人状态。
func (oc *OrderController) PrintStatus() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	fmt.Println("\n--- System Status ---")

	fmt.Printf("PENDING Orders (%d):\n", oc.pendingQueue.Len())
	if oc.pendingQueue.Len() == 0 {
		fmt.Println("  (none)")
	} else {
		for _, order := range oc.pendingQueue.Orders() {
			fmt.Printf("  %s\n", order.String())
		}
	}

	fmt.Printf("\nCOMPLETE Orders (%d):\n", len(oc.completedOrders))
	if len(oc.completedOrders) == 0 {
		fmt.Println("  (none)")
	} else {
		for _, order := range oc.completedOrders {
			fmt.Printf("  %s\n", order.String())
		}
	}

	fmt.Printf("\nBots (%d):\n", len(oc.bots))
	if len(oc.bots) == 0 {
		fmt.Println("  (none)")
	} else {
		for _, bot := range oc.bots {
			fmt.Printf("  %s\n", bot.String())
		}
	}
	fmt.Println("--------------------")
}

// GetTotalOrdersCreated 返回已创建的订单总数。
func (oc *OrderController) GetTotalOrdersCreated() int {
	oc.mu.Lock()
	defer oc.mu.Unlock()
	return oc.totalOrdersCreated
}

// GetPendingOrderCount 返回待处理订单数量。
func (oc *OrderController) GetPendingOrderCount() int {
	oc.mu.Lock()
	defer oc.mu.Unlock()
	return oc.pendingQueue.Len()
}

// GetCompletedOrderCount 返回已完成订单数量。
func (oc *OrderController) GetCompletedOrderCount() int {
	oc.mu.Lock()
	defer oc.mu.Unlock()
	return len(oc.completedOrders)
}

// GetActiveBotCount 返回当前活跃机器人数量。
func (oc *OrderController) GetActiveBotCount() int {
	oc.mu.Lock()
	defer oc.mu.Unlock()
	return len(oc.bots)
}

// PrintFinalStatus 打印模拟结束后的汇总状态。
func (oc *OrderController) PrintFinalStatus() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	fmt.Println("\nFinal Status:")

	vipCount := 0
	normalCount := 0
	for _, order := range oc.completedOrders {
		if order.Type == VIP {
			vipCount++
		} else {
			normalCount++
		}
	}

	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n",
		len(oc.completedOrders), vipCount, normalCount)
	fmt.Printf("- Orders Completed: %d\n", len(oc.completedOrders))
	fmt.Printf("- Active Bots: %d\n", len(oc.bots))
	fmt.Printf("- Pending Orders: %d\n", oc.pendingQueue.Len())
}
