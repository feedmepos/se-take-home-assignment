package order

import (
	"fmt"
	"sync/atomic"
	"time"
)

// Controller manages orders and cooking bots in memory.
type Controller struct {
	cfg Config

	nextOrderID  atomic.Int64
	nextBotID    atomic.Int64
	totalCreated atomic.Int64

	pendingOrders   *Queue
	completedOrders *Completed
	bots            *BotPool

	wake chan bool
}

// NewController creates a controller with default config.
func NewController() *Controller {
	return NewControllerWithConfig(DefaultConfig())
}

// NewControllerWithConfig creates a controller with the given config.
func NewControllerWithConfig(cfg Config) *Controller {
	if cfg.ProcessDuration <= 0 {
		cfg.ProcessDuration = DefaultConfig().ProcessDuration
	}
	c := &Controller{
		cfg:             cfg,
		pendingOrders:   NewQueue(),
		completedOrders: NewCompleted(),
		bots:            NewBotPool(),
		wake:            make(chan bool, 1),
	}
	c.nextOrderID.Store(1)
	c.nextBotID.Store(1)
	go c.dispatchLoop()
	return c
}

func (c *Controller) dispatchLoop() {
	for {
		<-c.wake

		// 一直分配，直到 pending 空或所有 Bot 都在忙
		for {
			if c.pendingOrders.Len() == 0 || !c.bots.HasIdle() {
				break
			}
			order := c.pendingOrders.Dequeue()
			bot := c.bots.AssignToIdle(order)
			c.LogWithTimestamp(fmt.Sprintf(
				"Bot #%d picked up %s Order #%d - Status: PROCESSING",
				bot.ID, order.Type.String(), order.ID,
			))
			go c.processOrder(bot, order)
		}
	}
}

func (c *Controller) notify() {
	select {
	case c.wake <- true:
	default:
	}
}

// LogWithTimestamp prints a message with HH:MM:SS timestamp.
func (c *Controller) LogWithTimestamp(message string) {
	fmt.Printf("[%s] %s\n", time.Now().Format("15:04:05"), message)
}

// CreateNormalOrder creates a normal customer order.
func (c *Controller) CreateNormalOrder() *Order {
	order := c.newOrder(Normal)
	c.pendingOrders.EnqueueNormal(order)
	c.LogWithTimestamp(fmt.Sprintf("Created Normal Order #%d - Status: PENDING", order.ID))
	c.notify()
	return order
}

// CreateVIPOrder creates a VIP member order with priority.
func (c *Controller) CreateVIPOrder() *Order {
	order := c.newOrder(VIP)
	c.pendingOrders.EnqueueVIP(order)
	c.LogWithTimestamp(fmt.Sprintf("Created VIP Order #%d - Status: PENDING", order.ID))
	c.notify()
	return order
}

func (c *Controller) newOrder(t OrderType) *Order {
	id := int(c.nextOrderID.Add(1) - 1)
	c.totalCreated.Add(1)
	return &Order{
		ID:       id,
		Type:     t,
		Status:   StatusPending,
		CreateAt: time.Now(),
	}
}

// AddBot creates a bot and immediately tries to pick up pending work.
func (c *Controller) AddBot() *Bot {
	bot := &Bot{
		ID:          int(c.nextBotID.Add(1) - 1),
		Status:      Idle,
		stopChannel: make(chan struct{}, 1),
	}
	c.bots.Add(bot)
	c.LogWithTimestamp(fmt.Sprintf("Bot #%d created - Status: ACTIVE", bot.ID))
	c.notify()
	return bot
}

// RemoveBot destroys the newest bot. If it was processing, the order
// returns to PENDING and remaining bots may pick it up.
func (c *Controller) RemoveBot() *Bot {
	bot, interrupted := c.bots.RemoveNewest()
	if bot == nil {
		return nil
	}

	if interrupted != nil {
		c.LogWithTimestamp(fmt.Sprintf("Bot #%d destroyed while PROCESSING", bot.ID))
		if interrupted.Type == VIP {
			c.pendingOrders.EnqueueVIP(interrupted)
		} else {
			c.pendingOrders.EnqueueNormal(interrupted)
		}
	} else {
		c.LogWithTimestamp(fmt.Sprintf("Bot #%d destroyed while IDLE", bot.ID))
	}

	c.notify()
	return bot
}

func (c *Controller) processOrder(bot *Bot, order *Order) {
	start := time.Now()

	select {
	case <-time.After(c.cfg.ProcessDuration):
		if !c.bots.Finish(bot, order) {
			return
		}

		c.completedOrders.Add(order)
		c.LogWithTimestamp(fmt.Sprintf(
			"Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %ds)",
			bot.ID, order.Type.String(), order.ID, int(time.Since(start).Seconds()),
		))

		if c.bots.IsIdle(bot) && c.pendingOrders.Len() == 0 {
			c.LogWithTimestamp(fmt.Sprintf("Bot #%d is now IDLE - No pending orders", bot.ID))
		}
		c.notify()

	case <-bot.stopChannel:
		c.bots.clearAfterStop(bot, order)
	}
}

// GetTotalOrdersCreated returns how many orders were created.
func (c *Controller) GetTotalOrdersCreated() int {
	return int(c.totalCreated.Load())
}

// GetPendingOrderCount returns pending queue length.
func (c *Controller) GetPendingOrderCount() int {
	return c.pendingOrders.Len()
}

// GetCompletedOrderCount returns completed order count.
func (c *Controller) GetCompletedOrderCount() int {
	return c.completedOrders.Len()
}

// GetActiveBotCount returns active bot count.
func (c *Controller) GetActiveBotCount() int {
	return c.bots.Len()
}

// PendingIDs returns pending order IDs in queue order.
func (c *Controller) PendingIDs() []int {
	return c.pendingOrders.IDs()
}

// CompletedIDs returns completed order IDs in completion order.
func (c *Controller) CompletedIDs() []int {
	return c.completedOrders.IDs()
}

// RemainingBotIDs returns active bot IDs (oldest first). For tests.
func (c *Controller) RemainingBotIDs() []int {
	return c.bots.IDs()
}

// BotState returns a bot's status and current order.
func (c *Controller) BotState(bot *Bot) (BotStatus, *Order) {
	return c.bots.State(bot)
}

// OrderStatus returns order status (mutated under BotPool lock).
func (c *Controller) OrderStatus(o *Order) string {
	return c.bots.OrderStatus(o)
}

// PrintFinalStatus prints a short summary.
func (c *Controller) PrintFinalStatus() {
	vipCount, normalCount := c.completedOrders.CountsByType()
	completedN := c.completedOrders.Len()
	botsN := c.bots.Len()
	pendingN := c.pendingOrders.Len()

	fmt.Println("\nFinal Status:")
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n",
		completedN, vipCount, normalCount)
	fmt.Printf("- Orders Completed: %d\n", completedN)
	fmt.Printf("- Active Bots: %d\n", botsN)
	fmt.Printf("- Pending Orders: %d\n", pendingN)
}
