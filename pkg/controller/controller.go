package controller

import (
	"fmt"
	"sync"
	"time"
)

// LogWithTimestamp prints a message with HH:MM:SS timestamp
func (oc *OrderController) LogWithTimestamp(message string) {
	timestamp := time.Now().Format("15:04:05")
	fmt.Printf("[%s] %s\n", timestamp, message)
}

// OrderType represents the type of order (Normal or VIP)
type OrderType int

const (
	Normal OrderType = iota
	VIP
)

// Order represents a McDonald's order
type Order struct {
	ID       int
	Type     OrderType
	Status   string
	CreateAt time.Time
}

func (o *Order) String() string {
	orderType := "NORMAL"
	if o.Type == VIP {
		orderType = "VIP"
	}
	return fmt.Sprintf("Order #%d (%s) - %s", o.ID, orderType, o.Status)
}

// BotStatus represents the current status of a bot
type BotStatus int

const (
	Idle BotStatus = iota
	Processing
)

// Bot represents a cooking bot
type Bot struct {
	ID           int
	Status       BotStatus
	CurrentOrder *Order
	stopChannel  chan bool
	processingWg *sync.WaitGroup
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

// OrderController manages the entire order processing system
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

// NewOrderController creates a new order controller
func NewOrderController() *OrderController {
	return &OrderController{
		orders:          make([]*Order, 0),
		pendingQueue:    make([]*Order, 0),
		completedOrders: make([]*Order, 0),
		bots:            make([]*Bot, 0),
		nextOrderID:     1,
		nextBotID:       1,
	}
}

// CreateNormalOrder creates a new normal order
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

	// Add to the end of pending queue (normal orders go after VIP orders)
	oc.pendingQueue = append(oc.pendingQueue, order)

	// Log the order creation with timestamp
	oc.LogWithTimestamp(fmt.Sprintf("Created Normal Order #%d - Status: PENDING", order.ID))

	// Try to assign to available bot
	oc.tryAssignOrderToBot()

	return order
}

// CreateVIPOrder creates a new VIP order
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

	// Insert VIP order at the correct position (after other VIP orders but before normal orders)
	insertIndex := 0
	for i, pendingOrder := range oc.pendingQueue {
		if pendingOrder.Type == Normal {
			insertIndex = i
			break
		}
		insertIndex = i + 1
	}

	// Insert at calculated position
	oc.pendingQueue = append(oc.pendingQueue[:insertIndex], append([]*Order{order}, oc.pendingQueue[insertIndex:]...)...)

	// Log the order creation with timestamp
	oc.LogWithTimestamp(fmt.Sprintf("Created VIP Order #%d - Status: PENDING", order.ID))

	// Try to assign to available bot
	oc.tryAssignOrderToBot()

	return order
}

// AddBot adds a new cooking bot
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

	// Log bot creation with timestamp
	oc.LogWithTimestamp(fmt.Sprintf("Bot #%d created - Status: ACTIVE", bot.ID))

	// Try to assign pending order to this new bot
	oc.tryAssignOrderToBot()

	return bot
}

// RemoveBot removes the newest bot
func (oc *OrderController) RemoveBot() *Bot {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.bots) == 0 {
		return nil
	}

	// Remove the newest bot (last in slice)
	botIndex := len(oc.bots) - 1
	bot := oc.bots[botIndex]

	// Stop the bot if it's processing
	if bot.Status == Processing {
		// Signal bot to stop
		select {
		case bot.stopChannel <- true:
		default:
		}

		// Return the order to pending queue at the front (VIP priority maintained)
		if bot.CurrentOrder != nil {
			bot.CurrentOrder.Status = "PENDING"
			if bot.CurrentOrder.Type == VIP {
				// Add VIP order at the beginning of VIP orders
				insertIndex := 0
				for i, pendingOrder := range oc.pendingQueue {
					if pendingOrder.Type == Normal {
						insertIndex = i
						break
					}
					insertIndex = i + 1
				}
				oc.pendingQueue = append(oc.pendingQueue[:insertIndex], append([]*Order{bot.CurrentOrder}, oc.pendingQueue[insertIndex:]...)...)
			} else {
				// Add normal order at the end
				oc.pendingQueue = append(oc.pendingQueue, bot.CurrentOrder)
			}
		}
		oc.LogWithTimestamp(fmt.Sprintf("Bot #%d destroyed while PROCESSING", bot.ID))
	} else {
		oc.LogWithTimestamp(fmt.Sprintf("Bot #%d destroyed while IDLE", bot.ID))
	}

	// Remove bot from slice
	oc.bots = oc.bots[:botIndex]

	return bot
}

// tryAssignOrderToBot attempts to assign a pending order to an available bot
func (oc *OrderController) tryAssignOrderToBot() {
	if len(oc.pendingQueue) == 0 {
		return
	}

	// Find an idle bot
	for _, bot := range oc.bots {
		if bot.Status == Idle {
			// Assign first pending order to this bot
			order := oc.pendingQueue[0]
			oc.pendingQueue = oc.pendingQueue[1:]

			bot.CurrentOrder = order
			bot.Status = Processing
			order.Status = "PROCESSING"

			// Log order pickup with timestamp
			orderType := "Normal"
			if order.Type == VIP {
				orderType = "VIP"
			}
			oc.LogWithTimestamp(fmt.Sprintf("Bot #%d picked up %s Order #%d - Status: PROCESSING", bot.ID, orderType, order.ID))

			// Start processing in goroutine
			go oc.processOrder(bot, order)
			break
		}
	}
}

// processOrder simulates the 10-second cooking process
func (oc *OrderController) processOrder(bot *Bot, order *Order) {
	bot.processingWg.Add(1)
	defer bot.processingWg.Done()

	startTime := time.Now()

	// Process for 10 seconds or until stopped
	select {
	case <-time.After(10 * time.Second):
		// Order completed successfully
		oc.mu.Lock()
		order.Status = "COMPLETE"
		oc.completedOrders = append(oc.completedOrders, order)
		bot.CurrentOrder = nil
		bot.Status = Idle

		// Log order completion with timestamp and processing time
		processingTime := time.Since(startTime)
		orderType := "Normal"
		if order.Type == VIP {
			orderType = "VIP"
		}
		oc.LogWithTimestamp(fmt.Sprintf("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %ds)",
			bot.ID, orderType, order.ID, int(processingTime.Seconds())))

		// Try to assign next order to this bot
		oc.tryAssignOrderToBot()

		// If no orders assigned, log idle state
		if bot.Status == Idle && len(oc.pendingQueue) == 0 {
			oc.LogWithTimestamp(fmt.Sprintf("Bot #%d is now IDLE - No pending orders", bot.ID))
		}

		oc.mu.Unlock()

	case <-bot.stopChannel:
		// Bot was removed, order should already be back in pending queue
		oc.mu.Lock()
		bot.CurrentOrder = nil
		bot.Status = Idle
		oc.mu.Unlock()
		return
	}
}

// PrintStatus prints the current status of the system
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

// GetTotalOrdersCreated returns the total number of orders created
func (oc *OrderController) GetTotalOrdersCreated() int {
	oc.mu.RLock()
	defer oc.mu.RUnlock()
	return oc.totalOrdersCreated
}

// GetPendingOrderCount returns the number of pending orders
func (oc *OrderController) GetPendingOrderCount() int {
	oc.mu.RLock()
	defer oc.mu.RUnlock()
	return len(oc.pendingQueue)
}

// GetCompletedOrderCount returns the number of completed orders
func (oc *OrderController) GetCompletedOrderCount() int {
	oc.mu.RLock()
	defer oc.mu.RUnlock()
	return len(oc.completedOrders)
}

// GetActiveBotCount returns the number of active bots
func (oc *OrderController) GetActiveBotCount() int {
	oc.mu.RLock()
	defer oc.mu.RUnlock()
	return len(oc.bots)
}

// PrintFinalStatus prints the final simulation status with timestamps
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
