package controller

import (
	"fmt"
	"mcdonalds-order-system/internal/bot"
	"mcdonalds-order-system/internal/model"
	"mcdonalds-order-system/internal/queue"
	"sync"
	"time"
)

type Logger func(format string, args ...interface{})

type Controller struct {
	pendingQueue    *queue.OrderQueue
	completedOrders []*model.Order
	bots            []*bot.Bot
	orderIDCounter  int
	botIDCounter    int
	processingTime  time.Duration
	mu              sync.Mutex
	logger          Logger
}

type Option func(*Controller)

// WithProcessingTime sets custom processing time (useful for testing)
func WithProcessingTime(d time.Duration) Option {
	return func(c *Controller) {
		c.processingTime = d
	}
}

// WithLogger sets custom logger
func WithLogger(logger Logger) Option {
	return func(c *Controller) {
		c.logger = logger
	}
}

func NewController(opts ...Option) *Controller {
	c := &Controller{
		pendingQueue:    queue.NewOrderQueue(),
		completedOrders: make([]*model.Order, 0),
		bots:            make([]*bot.Bot, 0),
		orderIDCounter:  1000,
		botIDCounter:    0,
		processingTime:  bot.DefaultProcessingTime,
		logger: func(format string, args ...interface{}) {
			timestamp := time.Now().Format("15:04:05")
			fmt.Printf("[%s] %s\n", timestamp, fmt.Sprintf(format, args...))
		},
	}

	for _, opt := range opts {
		opt(c)
	}

	return c
}

// AddNormalOrder creates a new normal order
func (c *Controller) AddNormalOrder() *model.Order {
	c.mu.Lock()
	c.orderIDCounter++
	order := model.NewOrder(c.orderIDCounter, model.OrderTypeNormal)
	c.pendingQueue.Enqueue(order)
	c.mu.Unlock()

	c.logger("Created Normal Order #%d - Status: %s", order.ID, order.Status)
	c.tryAssignOrders()
	return order
}

// AddVIPOrder creates a new VIP order
func (c *Controller) AddVIPOrder() *model.Order {
	c.mu.Lock()
	c.orderIDCounter++
	order := model.NewOrder(c.orderIDCounter, model.OrderTypeVIP)
	c.pendingQueue.Enqueue(order)
	c.mu.Unlock()

	c.logger("Created VIP Order #%d - Status: %s", order.ID, order.Status)
	c.tryAssignOrders()
	return order
}

// AddBot creates a new bot
func (c *Controller) AddBot() *bot.Bot {
	c.mu.Lock()
	c.botIDCounter++
	newBot := bot.NewBotWithProcessingTime(c.botIDCounter, c.processingTime, c.onOrderComplete, c.onBotIdle)
	c.bots = append(c.bots, newBot)
	c.mu.Unlock()

	c.logger("Bot #%d created - Status: ACTIVE", newBot.ID)
	c.tryAssignOrders()
	return newBot
}

// RemoveBot removes the newest bot
func (c *Controller) RemoveBot() {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.mu.Unlock()
		c.logger("No bots to remove")
		return
	}

	// Remove the newest bot (last in slice)
	lastBot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	c.mu.Unlock()

	// Stop the bot and get any unfinished order
	unfinishedOrder := lastBot.Stop()

	if unfinishedOrder != nil {
		c.pendingQueue.EnqueueFront(unfinishedOrder)
		c.logger("Bot #%d destroyed while processing %s - Order returned to PENDING", lastBot.ID, unfinishedOrder)
	} else {
		c.logger("Bot #%d destroyed while IDLE", lastBot.ID)
	}
}

// tryAssignOrders tries to assign pending orders to idle bots
func (c *Controller) tryAssignOrders() {
	c.mu.Lock()
	defer c.mu.Unlock()

	for _, b := range c.bots {
		if b.IsIdle() && !c.pendingQueue.IsEmpty() {
			order := c.pendingQueue.Dequeue()
			if order != nil {
				c.logger("Bot #%d picked up %s - Status: PROCESSING", b.ID, order)
				b.ProcessOrder(order)
			}
		}
	}

	// Check if any bot is idle with no pending orders
	for _, b := range c.bots {
		if b.IsIdle() && c.pendingQueue.IsEmpty() {
			c.logger("Bot #%d is now IDLE - No pending orders", b.ID)
		}
	}
}

func (c *Controller) onOrderComplete(order *model.Order) {
	c.mu.Lock()
	c.completedOrders = append(c.completedOrders, order)
	c.mu.Unlock()

	c.logger("Bot completed %s - Status: COMPLETE (Processing time: 10s)", order)
}

func (c *Controller) onBotIdle(b *bot.Bot) {
	c.tryAssignOrders()
}

// GetPendingOrders returns all pending orders
func (c *Controller) GetPendingOrders() []*model.Order {
	return c.pendingQueue.GetAll()
}

// GetCompletedOrders returns all completed orders
func (c *Controller) GetCompletedOrders() []*model.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	result := make([]*model.Order, len(c.completedOrders))
	copy(result, c.completedOrders)
	return result
}

// GetBots returns all active bots
func (c *Controller) GetBots() []*bot.Bot {
	c.mu.Lock()
	defer c.mu.Unlock()
	result := make([]*bot.Bot, len(c.bots))
	copy(result, c.bots)
	return result
}

// GetStats returns current statistics
func (c *Controller) GetStats() (totalOrders, completedOrders, pendingOrders, activeBots, vipOrders, normalOrders int) {
	c.mu.Lock()
	defer c.mu.Unlock()

	completedOrders = len(c.completedOrders)
	pendingOrders = c.pendingQueue.Size()
	activeBots = len(c.bots)

	for _, o := range c.completedOrders {
		if o.Type == model.OrderTypeVIP {
			vipOrders++
		} else {
			normalOrders++
		}
	}

	totalOrders = completedOrders + pendingOrders
	return
}
