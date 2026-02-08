package controller

import (
	"se-take-home-assignment/internal/logger"
	"sync"
	"sync/atomic"
	"time"
)

type OrderType int

const (
	OrderTypeNormal OrderType = iota
	OrderTypeVIP
)

type OrderStatus int

const (
	OrderStatusPending OrderStatus = iota
	OrderStatusProcessing
	OrderStatusComplete
)

type Order struct {
	ID       int
	Type     OrderType
	Status   OrderStatus
	BotID    int
	Created  time.Time
	Started  time.Time
	Completed time.Time
}

type BotStatus int

const (
	BotStatusIdle BotStatus = iota
	BotStatusProcessing
)

type Bot struct {
	ID       int
	Status   BotStatus
	Order    *Order
	stopChan chan bool
	mu       sync.Mutex
}

type OrderController struct {
	logger        *logger.Logger
	orders        []*Order
	pendingOrders []*Order
	completedOrders []*Order
	bots          []*Bot
	nextOrderID   int64 // Use int64 for atomic operations
	nextBotID     int64 // Use int64 for atomic operations
	mu            sync.Mutex
}

func NewOrderController(log *logger.Logger) *OrderController {
	return &OrderController{
		logger:          log,
		orders:          make([]*Order, 0),
		pendingOrders:   make([]*Order, 0),
		completedOrders: make([]*Order, 0),
		bots:            make([]*Bot, 0),
		nextOrderID:     1001,
		nextBotID:       1,
	}
}

func (oc *OrderController) CreateNormalOrder() {
	orderID := int(atomic.AddInt64(&oc.nextOrderID, 1) - 1)

	order := &Order{
		ID:      orderID,
		Type:    OrderTypeNormal,
		Status:  OrderStatusPending,
		Created: time.Now(),
	}

	oc.mu.Lock()
	oc.orders = append(oc.orders, order)
	oc.pendingOrders = append(oc.pendingOrders, order)
	oc.mu.Unlock()

	oc.logger.Log("Created Normal Order #%d - Status: PENDING", orderID)
	oc.assignOrdersToBots()
}

func (oc *OrderController) CreateVIPOrder() {
	orderID := int(atomic.AddInt64(&oc.nextOrderID, 1) - 1)

	order := &Order{
		ID:      orderID,
		Type:    OrderTypeVIP,
		Status:  OrderStatusPending,
		Created: time.Now(),
	}

	oc.mu.Lock()
	oc.orders = append(oc.orders, order)
	oc.insertVIPOrder(order)
	oc.mu.Unlock()

	oc.logger.Log("Created VIP Order #%d - Status: PENDING", orderID)
	oc.assignOrdersToBots()
}

func (oc *OrderController) AddBot() {
	botID := int(atomic.AddInt64(&oc.nextBotID, 1) - 1)

	bot := &Bot{
		ID:       botID,
		Status:   BotStatusIdle,
		stopChan: make(chan bool, 1),
	}

	oc.mu.Lock()
	oc.bots = append(oc.bots, bot)
	oc.mu.Unlock()

	oc.logger.Log("Bot #%d created - Status: ACTIVE", botID)
	oc.assignOrdersToBots()
}

func (oc *OrderController) RemoveBot() {
	bot := oc.removeBotFromList()
	if bot == nil {
		return
	}

	order, isProcessing := oc.stopBotProcessing(bot)
	if !isProcessing {
		oc.handleIdleBotRemoval(bot)
		return
	}

	oc.handleProcessingBotRemoval(bot, order)
}

// stopBotProcessing stops the bot's processing and returns the order if it was processing
// Returns (order, true) if bot was processing, (nil, false) if idle
func (oc *OrderController) stopBotProcessing(bot *Bot) (*Order, bool) {
	bot.mu.Lock()
	defer bot.mu.Unlock()

	isProcessing := bot.Status == BotStatusProcessing && bot.Order != nil
	if !isProcessing {
		return nil, false
	}

	bot.stopChan <- true
	order := bot.Order
	order.Status = OrderStatusPending
	order.BotID = 0
	return order, true
}

// handleIdleBotRemoval handles the removal of an idle bot
func (oc *OrderController) handleIdleBotRemoval(bot *Bot) {
	oc.logger.Log("Bot #%d destroyed while IDLE", bot.ID)
	oc.assignOrdersToBots()
}

// handleProcessingBotRemoval handles the removal of a processing bot
// Returns the order back to the pending queue with proper priority
func (oc *OrderController) handleProcessingBotRemoval(bot *Bot, order *Order) {
	oc.mu.Lock()
	oc.insertOrderToPending(order)
	oc.mu.Unlock()

	oc.logger.Log("Bot #%d destroyed while processing Order #%d - Order returned to PENDING", bot.ID, order.ID)
	oc.assignOrdersToBots()
}

// removeBotFromList removes and returns the newest bot (last in the slice)
// Returns nil if no bots exist. This function handles locking internally.
func (oc *OrderController) removeBotFromList() *Bot {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.bots) == 0 {
		return nil
	}

	botIndex := len(oc.bots) - 1
	bot := oc.bots[botIndex]
	oc.bots = oc.bots[:botIndex]
	return bot
}

func (oc *OrderController) assignOrdersToBots() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	for _, bot := range oc.bots {
		bot.mu.Lock()
		if bot.Status == BotStatusIdle && len(oc.pendingOrders) > 0 {
			// Get the first pending order (highest priority)
			order := oc.pendingOrders[0]
			oc.pendingOrders = oc.pendingOrders[1:]

			// Assign order to bot
			bot.Order = order
			bot.Status = BotStatusProcessing
			order.Status = OrderStatusProcessing
			order.BotID = bot.ID
			order.Started = time.Now()

			oc.logger.Log("Bot #%d picked up %s Order #%d - Status: PROCESSING",
				bot.ID, oc.getOrderTypeString(order.Type), order.ID)

			go oc.processOrder(bot)
		}
		bot.mu.Unlock()
	}
}

func (oc *OrderController) processOrder(bot *Bot) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	startTime := time.Now()
	duration := 10 * time.Second

	for {
		select {
		case <-bot.stopChan:
			return
		case <-ticker.C:
			if time.Since(startTime) >= duration {
				order := oc.completeOrderProcessing(bot)
				if order == nil {
					return
				}
				oc.finalizeOrderCompletion(bot, order)
				return
			}
		}
	}
}

// completeOrderProcessing marks the order as complete and sets bot to idle
// Returns the completed order, or nil if bot has no order
func (oc *OrderController) completeOrderProcessing(bot *Bot) *Order {
	bot.mu.Lock()
	defer bot.mu.Unlock()

	if bot.Order == nil {
		return nil
	}

	order := bot.Order
	order.Status = OrderStatusComplete
	order.Completed = time.Now()
	bot.Order = nil
	bot.Status = BotStatusIdle
	return order
}

// finalizeOrderCompletion updates completed orders, logs completion, and assigns next order
func (oc *OrderController) finalizeOrderCompletion(bot *Bot, order *Order) {
	processingTime := order.Completed.Sub(order.Started)

	oc.mu.Lock()
	oc.completedOrders = append(oc.completedOrders, order)
	hasPendingOrders := len(oc.pendingOrders) > 0
	oc.mu.Unlock()

	oc.logger.Log("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %ds)",
		bot.ID, oc.getOrderTypeString(order.Type), order.ID, int(processingTime.Seconds()))

	oc.assignOrdersToBots()

	if !hasPendingOrders {
		oc.logger.Log("Bot #%d is now IDLE - No pending orders", bot.ID)
	}
}

func (oc *OrderController) Wait(milliseconds int) {
	time.Sleep(time.Duration(milliseconds) * time.Millisecond)

	oc.assignOrdersToBots()
}

func (oc *OrderController) PrintStatus() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	vipCount := 0
	normalCount := 0
	for _, order := range oc.completedOrders {
		switch order.Type {
		case OrderTypeVIP:
			vipCount++
		case OrderTypeNormal:
			normalCount++
		}
	}

	oc.logger.Log("")
	oc.logger.Log("Final Status:")
	oc.logger.Log("- Total Orders Processed: %d (%d VIP, %d Normal)",
		len(oc.completedOrders), vipCount, normalCount)
	oc.logger.Log("- Orders Completed: %d", len(oc.completedOrders))
	oc.logger.Log("- Active Bots: %d", len(oc.bots))
	oc.logger.Log("- Pending Orders: %d", len(oc.pendingOrders))
}

// insertOrderToPending inserts an order into the pending queue with proper priority
// VIP orders are placed after all existing VIP orders but before all normal orders
// Normal orders are appended to the end
func (oc *OrderController) insertOrderToPending(order *Order) {
	switch order.Type {
	case OrderTypeVIP:
		oc.insertVIPOrder(order)
	case OrderTypeNormal:
		oc.pendingOrders = append(oc.pendingOrders, order)
	}
}

// insertVIPOrder inserts a VIP order into the pending queue
// VIP orders are placed after all existing VIP orders but before all normal orders
func (oc *OrderController) insertVIPOrder(order *Order) {
	// Find the insertion index: after all VIP orders, before all normal orders
	insertIndex := 0
	for i, pendingOrder := range oc.pendingOrders {
		if pendingOrder.Type == OrderTypeVIP {
			insertIndex = i + 1
		}
	}

	newPendingOrders := make([]*Order, 0, len(oc.pendingOrders)+1)
	newPendingOrders = append(newPendingOrders, oc.pendingOrders[:insertIndex]...)
	newPendingOrders = append(newPendingOrders, order)
	newPendingOrders = append(newPendingOrders, oc.pendingOrders[insertIndex:]...)
	oc.pendingOrders = newPendingOrders
}

func (oc *OrderController) getOrderTypeString(orderType OrderType) string {
	if orderType == OrderTypeVIP {
		return "VIP"
	}

	return "Normal"
}

