package controller

import (
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/se-take-home-assignment/internal/bot"
	"github.com/se-take-home-assignment/internal/model"
	"github.com/se-take-home-assignment/internal/queue"
)

// MaxBotID is the upper limit for bot IDs (int16 max).
const MaxBotID int16 = 32767

// MaxBots is the maximum number of concurrent bots allowed.
const MaxBots = 50

// MaxPendingOrders is the maximum number of orders allowed in the pending queue.
const MaxPendingOrders = 1000

// Controller manages the order queue and cooking bots.
type Controller struct {
	sync.Mutex
	queue     *queue.OrderQueue
	bots      []*bot.Bot
	completed []*model.Order
	orderSeq  int64 // auto-increment sequence within the same second
	orderTs   int64 // last timestamp used for order ID generation
	nextBot   int16
	output    io.Writer
}

// New creates a new Controller with the given output writer.
func New(output io.Writer) *Controller {
	return &Controller{
		queue:     queue.New(),
		bots:      make([]*bot.Bot, 0),
		completed: make([]*model.Order, 0),
		nextBot:   1,
		output:    output,
	}
}

// log prints a timestamped message to the output writer.
func (c *Controller) log(format string, args ...interface{}) {
	timestamp := time.Now().Format("15:04:05")
	msg := fmt.Sprintf(format, args...)
	fmt.Fprintf(c.output, "[%s] %s\n", timestamp, msg)
}

// SetOutput replaces the output writer (used by web server to intercept logs).
func (c *Controller) SetOutput(w io.Writer) {
	c.Lock()
	c.output = w
	c.Unlock()
}

// NewOrder creates a new order of the given type and adds it to the queue.
func (c *Controller) NewOrder(orderType model.OrderType) {
	c.Lock()
	defer c.Unlock()

	if c.queue.Len() >= MaxPendingOrders {
		c.log("Cannot add order - pending queue full (%d)", MaxPendingOrders)
		return
	}

	order := &model.Order{
		ID:     c.generateOrderID(),
		Type:   orderType,
		Status: model.Pending,
	}
	c.queue.Enqueue(order)
	c.log("%s added to PENDING", order)

	// Try to assign to an idle bot
	c.assignOrderToIdleBot()
}

// orderSeqBits is the number of bits reserved for the sequence part in order IDs.
const orderSeqBits = 16

// generateOrderID produces a unique int64 order ID: (unix_seconds << 16) | sequence.
// Supports up to 65535 orders per second.
// Must be called with mutex held.
func (c *Controller) generateOrderID() int64 {
	now := time.Now().Unix()
	if now == c.orderTs {
		c.orderSeq++
	} else {
		c.orderTs = now
		c.orderSeq = 1
	}
	return now<<orderSeqBits | c.orderSeq
}

// AddBot creates a new bot and starts processing if there are pending orders.
func (c *Controller) AddBot() {
	c.Lock()
	defer c.Unlock()

	if len(c.bots) >= MaxBots {
		c.log("Cannot add bot - maximum (%d) reached", MaxBots)
		return
	}

	b := bot.New(c.nextBot, c.onBotComplete)
	c.advanceBotID()
	c.bots = append(c.bots, b)

	// Try to assign a pending order to the new bot
	order := c.queue.Dequeue()
	if order != nil {
		c.log("Bot %d created - processing %s", b.ID, order)
		b.Process(order)
	} else {
		c.log("Bot %d created - idle (no pending orders)", b.ID)
	}
}

// advanceBotID increments the bot ID counter with wrap-around at MaxBotID.
// Must be called with mutex held.
func (c *Controller) advanceBotID() {
	if c.nextBot >= MaxBotID {
		c.nextBot = 1
	} else {
		c.nextBot++
	}
}

// RemoveBot destroys the newest bot. If it's processing, the order returns to the queue.
func (c *Controller) RemoveBot() {
	c.Lock()
	defer c.Unlock()

	if len(c.bots) == 0 {
		c.log("No bots to remove")
		return
	}

	// Remove the newest bot (last in the slice)
	newest := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]

	// Stop the bot and get any in-progress order
	order := newest.Stop()
	if order != nil {
		c.queue.InsertByPriority(order)
		c.log("Bot %d removed - %s returned to PENDING", newest.ID, order)
	} else {
		c.log("Bot %d removed", newest.ID)
	}
}

// onBotComplete is called when a bot finishes processing an order.
func (c *Controller) onBotComplete(b *bot.Bot, order *model.Order) {
	c.Lock()
	defer c.Unlock()

	c.completed = append(c.completed, order)
	c.log("%s completed by Bot %d - moved to COMPLETE", order, b.ID)

	// Try to assign next pending order to this bot
	nextOrder := c.queue.Dequeue()
	if nextOrder != nil {
		c.log("Bot %d processing %s", b.ID, nextOrder)
		b.Process(nextOrder)
	}
}

// assignOrderToIdleBot tries to assign a pending order to any idle bot.
// Must be called with mutex held.
func (c *Controller) assignOrderToIdleBot() {
	for _, b := range c.bots {
		if b.IsIdle() && c.queue.Len() > 0 {
			order := c.queue.Dequeue()
			if order != nil {
				c.log("Bot %d processing %s", b.ID, order)
				b.Process(order)
				return
			}
		}
	}
}

// PendingOrders returns the current pending orders.
func (c *Controller) PendingOrders() []*model.Order {
	return c.queue.Orders()
}

// CompletedOrders returns the completed orders.
func (c *Controller) CompletedOrders() []*model.Order {
	c.Lock()

	result := make([]*model.Order, len(c.completed))
	copy(result, c.completed)

	c.Unlock()
	return result
}

// Bots returns the current bot count.
func (c *Controller) BotCount() int {
	c.Lock()
	botCount := len(c.bots)
	c.Unlock()
	return botCount
}

// ProcessingOrders returns orders currently being processed by bots.
func (c *Controller) ProcessingOrders() []*model.Order {
	c.Lock()
	processing := make([]*model.Order, 0, len(c.bots))
	for _, b := range c.bots {
		if b.CurrentOrder != nil {
			processing = append(processing, b.CurrentOrder)
		}
	}
	c.Unlock()
	return processing
}
