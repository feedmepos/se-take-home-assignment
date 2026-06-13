package controller

import (
	"context"
	"fmt"
	"sync"
	"time"
)

const FirstOrderID = 1

// LogWithTimestamp prints a message with HH:MM:SS timestamp.
func (oc *OrderController) LogWithTimestamp(message string) {
	timestamp := time.Now().Format("15:04:05")
	fmt.Printf("[%s] %s\n", timestamp, message)
}

// OrderType represents the type of order (Normal or VIP).
type OrderType int

const (
	Normal OrderType = iota
	VIP
)

// Order represents a McDonald's order.
type Order struct {
	ID                int
	Type              OrderType
	Status            string
	CreateAt          time.Time
	PendingQueueIndex int
}

func (o *Order) String() string {
	orderType := "NORMAL"
	if o.Type == VIP {
		orderType = "VIP"
	}
	return fmt.Sprintf("Order #%d (%s) - %s", o.ID, orderType, o.Status)
}

// BotStatus represents the current status of a bot.
type BotStatus int

const (
	Idle BotStatus = iota
	Processing
)

// Bot represents a cooking bot.
type Bot struct {
	ID               int
	Status           BotStatus
	CurrentOrder     *Order
	processingCancel context.CancelFunc
	processingGen    uint64
}

func (b *Bot) String() string {
	status := "IDLE"
	if b.Status == Processing {
		status = "PROCESSING"
	}
	if b.CurrentOrder != nil {
		return fmt.Sprintf("Bot #%d (%s) - Processing Order #%d", b.ID, status, b.CurrentOrder.ID)
	}
	return fmt.Sprintf("Bot #%d (%s)", b.ID, status)
}

// OrderController manages the entire order processing system.
type OrderController struct {
	mu                 sync.RWMutex
	orders             []*Order
	pendingQueue       []*Order
	completedOrders    []*Order
	bots               []*Bot
	nextOrderID        int
	nextBotID          int
	totalOrdersCreated int
}

// NewOrderController creates a new order controller.
func NewOrderController() *OrderController {
	return &OrderController{
		orders:          make([]*Order, 0),
		pendingQueue:    make([]*Order, 0),
		completedOrders: make([]*Order, 0),
		bots:            make([]*Bot, 0),
		nextOrderID:     FirstOrderID,
		nextBotID:       1,
	}
}

// CreateNormalOrder creates a new normal order.
func (oc *OrderController) CreateNormalOrder() *Order {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order := &Order{
		ID:       oc.nextOrderID,
		Type:     Normal,
		Status:   "PENDING",
		CreateAt: time.Now(),
	}

	oc.nextOrderID++
	oc.totalOrdersCreated++
	oc.orders = append(oc.orders, order)
	oc.pendingQueue = append(oc.pendingQueue, order)

	oc.LogWithTimestamp(fmt.Sprintf("Created Normal Order #%d - Status: PENDING", order.ID))
	oc.tryAssignOrderToBot()

	return order
}

// CreateVIPOrder creates a new VIP order.
func (oc *OrderController) CreateVIPOrder() *Order {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order := &Order{
		ID:       oc.nextOrderID,
		Type:     VIP,
		Status:   "PENDING",
		CreateAt: time.Now(),
	}

	oc.nextOrderID++
	oc.totalOrdersCreated++
	oc.orders = append(oc.orders, order)

	insertIndex := len(oc.pendingQueue)
	for i, pendingOrder := range oc.pendingQueue {
		if pendingOrder.Type == Normal {
			insertIndex = i
			break
		}
	}
	oc.pendingQueue = append(oc.pendingQueue[:insertIndex], append([]*Order{order}, oc.pendingQueue[insertIndex:]...)...)

	oc.LogWithTimestamp(fmt.Sprintf("Created VIP Order #%d - Status: PENDING", order.ID))
	oc.tryAssignOrderToBot()

	return order
}

// AddBot adds a new cooking bot.
func (oc *OrderController) AddBot() *Bot {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	bot := &Bot{
		ID:     oc.nextBotID,
		Status: Idle,
	}

	oc.nextBotID++
	oc.bots = append(oc.bots, bot)

	oc.LogWithTimestamp(fmt.Sprintf("Bot #%d created - Status: ACTIVE", bot.ID))
	oc.tryAssignOrderToBot()

	return bot
}

// RemoveBot removes the newest bot.
func (oc *OrderController) RemoveBot() *Bot {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.bots) == 0 {
		return nil
	}

	botIndex := len(oc.bots) - 1
	bot := oc.bots[botIndex]

	if bot.Status == Processing {
		if bot.processingCancel != nil {
			bot.processingCancel()
		}

		if bot.CurrentOrder != nil {
			order := bot.CurrentOrder
			order.Status = "PENDING"
			oc.reinsertOrderAtOriginalPosition(order)
			bot.CurrentOrder = nil
		}
		bot.Status = Idle
		oc.LogWithTimestamp(fmt.Sprintf("Bot #%d destroyed while PROCESSING", bot.ID))
	} else {
		oc.LogWithTimestamp(fmt.Sprintf("Bot #%d destroyed while IDLE", bot.ID))
	}

	oc.bots = oc.bots[:botIndex]
	oc.tryAssignOrderToBot()

	return bot
}

func (oc *OrderController) reinsertOrderAtOriginalPosition(order *Order) {
	insertAt := order.PendingQueueIndex
	if insertAt > len(oc.pendingQueue) {
		insertAt = len(oc.pendingQueue)
	}
	oc.pendingQueue = append(oc.pendingQueue[:insertAt], append([]*Order{order}, oc.pendingQueue[insertAt:]...)...)
}

// tryAssignOrderToBot attempts to assign a pending order to an available bot.
// Caller must hold oc.mu.
func (oc *OrderController) tryAssignOrderToBot() {
	for len(oc.pendingQueue) > 0 {
		assigned := false
		for _, bot := range oc.bots {
			if bot.Status != Idle {
				continue
			}

			order := oc.pendingQueue[0]
			order.PendingQueueIndex = 0
			oc.pendingQueue = oc.pendingQueue[1:]

			bot.CurrentOrder = order
			bot.Status = Processing
			order.Status = "PROCESSING"

			orderType := "Normal"
			if order.Type == VIP {
				orderType = "VIP"
			}
			oc.LogWithTimestamp(fmt.Sprintf("Bot #%d picked up %s Order #%d - Status: PROCESSING", bot.ID, orderType, order.ID))

			ctx, cancel := context.WithCancel(context.Background())
			bot.processingCancel = cancel
			bot.processingGen++
			gen := bot.processingGen

			go oc.processOrder(bot, order, ctx, gen)
			assigned = true
			break
		}
		if !assigned {
			return
		}
	}
}

func (oc *OrderController) processOrder(bot *Bot, order *Order, ctx context.Context, gen uint64) {
	startTime := time.Now()
	timer := time.NewTimer(10 * time.Second)
	defer timer.Stop()

	select {
	case <-timer.C:
		oc.mu.Lock()
		defer oc.mu.Unlock()

		if bot.processingGen != gen || bot.CurrentOrder != order || order.Status != "PROCESSING" {
			return
		}

		order.Status = "COMPLETE"
		oc.completedOrders = append(oc.completedOrders, order)
		bot.CurrentOrder = nil
		bot.Status = Idle
		bot.processingCancel = nil

		processingTime := time.Since(startTime)
		orderType := "Normal"
		if order.Type == VIP {
			orderType = "VIP"
		}
		oc.LogWithTimestamp(fmt.Sprintf("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %ds)",
			bot.ID, orderType, order.ID, int(processingTime.Seconds())))

		oc.tryAssignOrderToBot()

		if bot.Status == Idle && len(oc.pendingQueue) == 0 {
			oc.LogWithTimestamp(fmt.Sprintf("Bot #%d is now IDLE - No pending orders", bot.ID))
		}

	case <-ctx.Done():
		return
	}
}

// PrintStatus prints the current status of the system.
func (oc *OrderController) PrintStatus() {
	oc.mu.RLock()
	defer oc.mu.RUnlock()

	fmt.Println("\n--- System Status ---")

	fmt.Printf("PENDING Orders (%d):\n", len(oc.pendingQueue))
	if len(oc.pendingQueue) == 0 {
		fmt.Println("  (none)")
	} else {
		for _, order := range oc.pendingQueue {
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

// GetTotalOrdersCreated returns the total number of orders created.
func (oc *OrderController) GetTotalOrdersCreated() int {
	oc.mu.RLock()
	defer oc.mu.RUnlock()
	return oc.totalOrdersCreated
}

// GetPendingOrderCount returns the number of pending orders.
func (oc *OrderController) GetPendingOrderCount() int {
	oc.mu.RLock()
	defer oc.mu.RUnlock()
	return len(oc.pendingQueue)
}

// GetCompletedOrderCount returns the number of completed orders.
func (oc *OrderController) GetCompletedOrderCount() int {
	oc.mu.RLock()
	defer oc.mu.RUnlock()
	return len(oc.completedOrders)
}

// GetActiveBotCount returns the number of active bots.
func (oc *OrderController) GetActiveBotCount() int {
	oc.mu.RLock()
	defer oc.mu.RUnlock()
	return len(oc.bots)
}

// PrintFinalStatus prints the final simulation status.
func (oc *OrderController) PrintFinalStatus() {
	oc.mu.RLock()
	defer oc.mu.RUnlock()

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
	fmt.Printf("- Pending Orders: %d\n", len(oc.pendingQueue))
}

// WaitUntilIdle blocks until all bots are idle and no orders are pending.
func (oc *OrderController) WaitUntilIdle() {
	for {
		oc.mu.RLock()
		busy := false
		for _, bot := range oc.bots {
			if bot.Status == Processing {
				busy = true
				break
			}
		}
		pending := len(oc.pendingQueue)
		oc.mu.RUnlock()

		if !busy && pending == 0 {
			time.Sleep(100 * time.Millisecond)
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
}
