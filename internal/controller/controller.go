package controller

import (
	"assignment/internal/bot"
	"assignment/internal/order"
	"fmt"
	"sync"
	"time"
)

// Controller manages orders and bots
type Controller struct {
	mu           sync.Mutex
	vipOrders    []*order.Order  // Separate array for VIP orders
	normalOrders []*order.Order  // Separate array for Normal orders
	bots         []*bot.Bot
	orderCounter int
	botCounter   int
	logger       func(string)
}

// NewController creates a new controller
func NewController(logger func(string)) *Controller {
	return &Controller{
		vipOrders:    make([]*order.Order, 0),
		normalOrders: make([]*order.Order, 0),
		bots:         make([]*bot.Bot, 0),
		orderCounter: 0,
		botCounter:   0,
		logger:       logger,
	}
}

// CreateNormalOrder creates a new normal order and adds it to the normal orders queue
func (c *Controller) CreateNormalOrder() *order.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	c.orderCounter++
	o := order.NewOrder(c.orderCounter, order.Normal)
	
	// Normal orders go to the end of the normal orders array
	c.normalOrders = append(c.normalOrders, o)
	
	timestamp := time.Now().Format("15:04:05")
	c.logger(fmt.Sprintf("[%s] Normal Order #%d created - Status: %s", timestamp, o.ID, o.Status))
	
	// Try to assign to an idle bot
	c.assignOrderToBot()
	
	return o
}

// CreateVIPOrder creates a new VIP order and adds it to the VIP orders queue
func (c *Controller) CreateVIPOrder() *order.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	c.orderCounter++
	o := order.NewOrder(c.orderCounter, order.VIP)
	
	// VIP orders go to the end of the VIP orders array (FIFO within VIP)
	c.vipOrders = append(c.vipOrders, o)
	
	timestamp := time.Now().Format("15:04:05")
	c.logger(fmt.Sprintf("[%s] VIP Order #%d created - Status: %s", timestamp, o.ID, o.Status))
	
	// Try to assign to an idle bot
	c.assignOrderToBot()
	
	return o
}

// AddBot creates a new bot and starts it processing orders
func (c *Controller) AddBot() *bot.Bot {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	c.botCounter++
	b := bot.NewBot(c.botCounter)
	c.bots = append(c.bots, b)
	
	timestamp := time.Now().Format("15:04:05")
	c.logger(fmt.Sprintf("[%s] Bot #%d added", timestamp, b.ID))
	
	// Start the bot processing orders
	go c.processOrdersForBot(b)
	
	return b
}

// RemoveBot removes the newest bot (last in the slice)
func (c *Controller) RemoveBot() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	if len(c.bots) == 0 {
		return false
	}
	
	// Remove the last bot (newest)
	b := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	
	// Stop the bot if it's processing
	if b.IsProcessing() && b.CurrentOrder != nil {
		b.Stop()
		o := b.CurrentOrder
		o.SetPending()
		
		// Re-insert the order back into the appropriate queue
		c.insertOrderBack(o)
		
		timestamp := time.Now().Format("15:04:05")
		c.logger(fmt.Sprintf("[%s] Bot #%d removed - Order #%d returned to PENDING", timestamp, b.ID, o.ID))
	} else {
		timestamp := time.Now().Format("15:04:05")
		c.logger(fmt.Sprintf("[%s] Bot #%d removed", timestamp, b.ID))
	}
	
	// Try to assign any pending orders to remaining bots
	c.assignOrderToBot()
	
	return true
}

// takeNextOrderForBot finds and removes the next pending order for a bot.
// Uses defer c.mu.Unlock() so the mutex is always released (even on panic or return).
// Returns (order, true) if an order was taken, or (nil, false) if bot doesn't exist or no pending orders.
func (c *Controller) takeNextOrderForBot(b *bot.Bot) (*order.Order, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Check if bot still exists
	botExists := false
	for _, existingBot := range c.bots {
		if existingBot.ID == b.ID {
			botExists = true
			break
		}
	}
	if !botExists {
		return nil, false
	}

	// Find next pending order (VIP first, then Normal)
	var nextOrder *order.Order
	var orderIndex int = -1
	var isVIP bool = false

	for i, o := range c.vipOrders {
		if o.Status == order.PENDING {
			nextOrder = o
			orderIndex = i
			isVIP = true
			break
		}
	}
	if nextOrder == nil {
		for i, o := range c.normalOrders {
			if o.Status == order.PENDING {
				nextOrder = o
				orderIndex = i
				isVIP = false
				break
			}
		}
	}
	if nextOrder == nil {
		return nil, true // bot exists but no orders
	}

	// Remove order from appropriate queue
	if isVIP {
		c.vipOrders = append(c.vipOrders[:orderIndex], c.vipOrders[orderIndex+1:]...)
	} else {
		c.normalOrders = append(c.normalOrders[:orderIndex], c.normalOrders[orderIndex+1:]...)
	}
	return nextOrder, true
}

// returnOrderToQueue inserts an order back into the appropriate queue.
// Uses defer c.mu.Unlock() so the mutex is always released.
func (c *Controller) returnOrderToQueue(o *order.Order) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.insertOrderBack(o)
}

// processOrdersForBot continuously processes orders for a bot
func (c *Controller) processOrdersForBot(b *bot.Bot) {
	for {
		// Check if bot should stop
		select {
		case <-b.ShouldStop():
			return
		default:
		}

		nextOrder, ok := c.takeNextOrderForBot(b)
		if !ok {
			return // bot was removed
		}
		if nextOrder == nil {
			// No pending orders, bot becomes idle
			select {
			case <-b.ShouldStop():
				return
			case <-time.After(100 * time.Millisecond):
				continue
			}
		}

		// Process the order (outside of lock - no defer needed here)
		timestamp := time.Now().Format("15:04:05")
		c.logger(fmt.Sprintf("[%s] Bot #%d started processing Order #%d", timestamp, b.ID, nextOrder.ID))

		completed := b.StartProcessing(nextOrder)

		if completed {
			timestamp := time.Now().Format("15:04:05")
			c.logger(fmt.Sprintf("[%s] Order #%d completed by Bot #%d - Status: %s", timestamp, nextOrder.ID, b.ID, nextOrder.Status))
		}
		// Return order to queue (completed for tracking, or cancelled back to pending)
		c.returnOrderToQueue(nextOrder)
	}
}

// assignOrderToBot tries to assign a pending order to an idle bot
// Must be called with lock held
func (c *Controller) assignOrderToBot() {
	// Find idle bots
	idleBots := make([]*bot.Bot, 0)
	for _, b := range c.bots {
		if b.IsIdle() {
			idleBots = append(idleBots, b)
		}
	}
	
	// Count pending orders (VIP + Normal)
	pendingCount := 0
	for _, o := range c.vipOrders {
		if o.Status == order.PENDING {
			pendingCount++
		}
	}
	for _, o := range c.normalOrders {
		if o.Status == order.PENDING {
			pendingCount++
		}
	}
	
	// The bot will pick up the order in its processing loop
	// We just need to ensure the bot is running
}

// insertOrderBack inserts an order back into the appropriate queue
// Must be called with lock held
func (c *Controller) insertOrderBack(o *order.Order) {
	if o.IsVIP() {
		// VIP orders go back to VIP queue
		c.vipOrders = append(c.vipOrders, o)
	} else {
		// Normal orders go back to Normal queue
		c.normalOrders = append(c.normalOrders, o)
	}
}

// GetState returns the current state of the system
func (c *Controller) GetState() ([]*order.Order, []*bot.Bot) {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	// Combine VIP and Normal orders (VIP first)
	allOrders := make([]*order.Order, 0, len(c.vipOrders)+len(c.normalOrders))
	allOrders = append(allOrders, c.vipOrders...)
	allOrders = append(allOrders, c.normalOrders...)
	
	// Return copies to avoid race conditions
	ordersCopy := make([]*order.Order, len(allOrders))
	copy(ordersCopy, allOrders)
	
	botsCopy := make([]*bot.Bot, len(c.bots))
	copy(botsCopy, c.bots)
	
	return ordersCopy, botsCopy
}

// GetPendingOrders returns all pending orders
func (c *Controller) GetPendingOrders() []*order.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	pending := make([]*order.Order, 0)
	for _, o := range c.vipOrders {
		if o.Status == order.PENDING {
			pending = append(pending, o)
		}
	}
	for _, o := range c.normalOrders {
		if o.Status == order.PENDING {
			pending = append(pending, o)
		}
	}
	return pending
}

// GetCompleteOrders returns all completed orders
func (c *Controller) GetCompleteOrders() []*order.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	complete := make([]*order.Order, 0)
	for _, o := range c.vipOrders {
		if o.Status == order.COMPLETE {
			complete = append(complete, o)
		}
	}
	for _, o := range c.normalOrders {
		if o.Status == order.COMPLETE {
			complete = append(complete, o)
		}
	}
	return complete
}

// GetVIPOrders returns all VIP orders
func (c *Controller) GetVIPOrders() []*order.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	vipCopy := make([]*order.Order, len(c.vipOrders))
	copy(vipCopy, c.vipOrders)
	return vipCopy
}

// GetNormalOrders returns all Normal orders
func (c *Controller) GetNormalOrders() []*order.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	normalCopy := make([]*order.Order, len(c.normalOrders))
	copy(normalCopy, c.normalOrders)
	return normalCopy
}
