package controller

import (
	"sync"

	"github.com/dnisting/se-take-home-assignment/internal/bot"
	"github.com/dnisting/se-take-home-assignment/internal/models"
	"github.com/dnisting/se-take-home-assignment/internal/queue"
)

// Controller orchestrates the order queue and bot pool.
type Controller struct {
	mu          sync.Mutex
	queue       *queue.OrderQueue
	bots        []*bot.Bot
	logFunc     models.LogFunc
	nextOrderID int
	nextBotID   int
	completed   int
	vipCount    int
	normalCount int
}

// New creates a new Controller with the given log function.
func New(logFunc models.LogFunc) *Controller {
	return &Controller{
		queue:       queue.NewOrderQueue(),
		logFunc:     logFunc,
		nextOrderID: 1001,
		nextBotID:   1,
	}
}

// NewNormalOrder creates a new Normal order and adds it to the pending queue.
func (c *Controller) NewNormalOrder() {
	c.mu.Lock()
	id := c.nextOrderID
	c.nextOrderID++
	c.normalCount++
	c.mu.Unlock()

	order := &models.Order{ID: id, Type: models.OrderTypeNormal, Status: models.OrderStatusPending}
	c.queue.Enqueue(order)
	c.logFunc("Created Normal Order #%d - Status: PENDING (queue: %d)", id, c.queue.Len())
	c.notifyIdleBots()
}

// NewVIPOrder creates a new VIP order and adds it to the pending queue with priority.
func (c *Controller) NewVIPOrder() {
	c.mu.Lock()
	id := c.nextOrderID
	c.nextOrderID++
	c.vipCount++
	c.mu.Unlock()

	order := &models.Order{ID: id, Type: models.OrderTypeVIP, Status: models.OrderStatusPending}
	c.queue.Enqueue(order)
	c.logFunc("Created VIP Order #%d - Status: PENDING (queue: %d)", id, c.queue.Len())
	c.notifyIdleBots()
}

// AddBot creates a new bot and starts it processing orders.
func (c *Controller) AddBot() {
	c.mu.Lock()
	id := c.nextBotID
	c.nextBotID++
	c.mu.Unlock()

	b := bot.NewBot(id, c.queue, c.logFunc)
	c.logFunc("Bot #%d created - Status: ACTIVE", id)

	c.mu.Lock()
	c.bots = append(c.bots, b)
	c.mu.Unlock()

	b.Start()
}

// RemoveBot destroys the newest bot. If it was processing an order,
// that order returns to the front of the PENDING queue.
func (c *Controller) RemoveBot() {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.mu.Unlock()
		return
	}

	newest := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	c.mu.Unlock()

	order := newest.Stop()

	if order != nil {
		c.queue.EnqueueFront(order)
		c.logFunc("Bot #%d destroyed while processing Order #%d - Order returned to PENDING (queue: %d)", newest.ID, order.ID, c.queue.Len())
		c.notifyIdleBots()
	} else {
		c.logFunc("Bot #%d destroyed while IDLE", newest.ID)
	}
}

// GetStatus returns a summary of the current system state.
func (c *Controller) GetStatus() (totalOrders, completedOrders, activeBots, pendingOrders, vipCount, normalCount int) {
	c.mu.Lock()
	total := c.nextOrderID - 1001
	vip := c.vipCount
	normal := c.normalCount
	bots := len(c.bots)
	c.mu.Unlock()

	pending := c.queue.Len()
	completed := total - pending

	// Subtract in-progress orders from completed count
	c.mu.Lock()
	for _, b := range c.bots {
		if !b.IsIdle() {
			completed--
		}
	}
	c.mu.Unlock()

	return total, completed, bots, pending, vip, normal
}

func (c *Controller) notifyIdleBots() {
	c.mu.Lock()
	defer c.mu.Unlock()

	for _, b := range c.bots {
		if b.IsIdle() {
			b.Notify()
		}
	}
}

// Shutdown stops all bots gracefully.
func (c *Controller) Shutdown() {
	c.mu.Lock()
	bots := make([]*bot.Bot, len(c.bots))
	copy(bots, c.bots)
	c.mu.Unlock()

	for _, b := range bots {
		b.Stop()
	}
}
