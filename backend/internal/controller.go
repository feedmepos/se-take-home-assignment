package internal

import (
	"fmt"
	"io"
	"sync"
	"time"
)

const DefaultProcessingTime = 10 * time.Second

type Controller struct {
	mu             sync.Mutex
	pendingOrders  []*Order
	completeOrders []*Order
	bots           []*Bot
	nextOrderID    int
	nextBotID      int
	out            io.Writer
	processingTime time.Duration
	now            func() time.Time
}

func NewController(out io.Writer) *Controller {
	return &Controller{
		nextOrderID:    1,
		nextBotID:      1,
		out:            out,
		processingTime: DefaultProcessingTime,
		now:            time.Now,
	}
}

func (c *Controller) SetProcessingTime(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.processingTime = d
}

func (c *Controller) log(format string, args ...any) {
	fmt.Fprintf(c.out, "[%s] %s\n", c.now().Format("15:04:05"), fmt.Sprintf(format, args...))
}

func (c *Controller) AddOrder(t OrderType) *Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	order := &Order{
		ID:        c.nextOrderID,
		Type:      t,
		CreatedAt: c.now(),
	}
	c.nextOrderID++
	c.pendingOrders = insertWithPriority(c.pendingOrders, order)
	c.log("Created %s Order #%d - Status: PENDING", t, order.ID)
	c.assign()
	return order
}

func (c *Controller) AddBot() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()

	bot := &Bot{
		ID:     c.nextBotID,
		Status: BotIdle,
	}
	c.nextBotID++
	c.bots = append(c.bots, bot)
	c.log("Bot #%d created - Status: IDLE", bot.ID)
	c.assign()
	return bot
}

func (c *Controller) RemoveBot() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.bots) == 0 {
		c.log("No bots to remove")
		return nil
	}

	last := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]

	if last.timer != nil {
		last.timer.Stop()
		last.timer = nil
	}

	if last.Status == BotProcessing && last.Order != nil {
		order := last.Order
		last.Order = nil
		last.Status = BotIdle
		c.pendingOrders = insertWithPriority(c.pendingOrders, order)
		c.log("Bot #%d destroyed - %s Order #%d returned to PENDING", last.ID, order.Type, order.ID)
	} else {
		c.log("Bot #%d destroyed (was IDLE)", last.ID)
	}
	return last
}

// assign matches idle bots with pending orders. Caller must hold c.mu.
func (c *Controller) assign() {
	for _, bot := range c.bots {
		if bot.Status != BotIdle || len(c.pendingOrders) == 0 {
			continue
		}
		order := c.pendingOrders[0]
		c.pendingOrders = c.pendingOrders[1:]

		bot.Status = BotProcessing
		bot.Order = order
		bot.StartTime = c.now()
		c.log("Bot #%d picked up %s Order #%d - Status: PROCESSING", bot.ID, order.Type, order.ID)

		captured := bot
		bot.timer = time.AfterFunc(c.processingTime, func() {
			c.completeOrder(captured)
		})
	}
}

func (c *Controller) completeOrder(bot *Bot) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Bot may have been removed while the timer was firing.
	stillAlive := false
	for _, b := range c.bots {
		if b == bot {
			stillAlive = true
			break
		}
	}
	if !stillAlive || bot.Order == nil {
		return
	}

	order := bot.Order
	c.completeOrders = append(c.completeOrders, order)
	bot.Status = BotIdle
	bot.Order = nil
	bot.timer = nil
	c.log("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %ds)",
		bot.ID, order.Type, order.ID, int(c.processingTime.Seconds()))

	idleAfter := len(c.pendingOrders) == 0
	c.assign()
	if idleAfter {
		c.log("Bot #%d is now IDLE - No pending orders", bot.ID)
	}
}

// Snapshot returns a read-only view of current state, for display.
type Snapshot struct {
	Pending  []OrderView
	Complete []OrderView
	Bots     []BotView
}

type OrderView struct {
	ID   int
	Type string
}

type BotView struct {
	ID     int
	Status string
	Order  *OrderView
}

func (c *Controller) Snapshot() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	s := Snapshot{}
	for _, o := range c.pendingOrders {
		s.Pending = append(s.Pending, OrderView{ID: o.ID, Type: o.Type.String()})
	}
	for _, o := range c.completeOrders {
		s.Complete = append(s.Complete, OrderView{ID: o.ID, Type: o.Type.String()})
	}
	for _, b := range c.bots {
		bv := BotView{ID: b.ID, Status: b.Status.String()}
		if b.Order != nil {
			bv.Order = &OrderView{ID: b.Order.ID, Type: b.Order.Type.String()}
		}
		s.Bots = append(s.Bots, bv)
	}
	return s
}

// insertWithPriority inserts order keeping VIP/Normal priority.
// Within the same type, smaller id (older) goes first.
func insertWithPriority(list []*Order, order *Order) []*Order {
	insertAt := -1

	if order.Type == OrderVIP {
		for i, o := range list {
			if o.Type == OrderVIP && o.ID > order.ID {
				insertAt = i
				break
			}
		}
		if insertAt == -1 {
			firstNormal := -1
			for i, o := range list {
				if o.Type == OrderNormal {
					firstNormal = i
					break
				}
			}
			if firstNormal == -1 {
				insertAt = len(list)
			} else {
				insertAt = firstNormal
			}
		}
	} else {
		for i, o := range list {
			if o.Type == OrderNormal && o.ID > order.ID {
				insertAt = i
				break
			}
		}
		if insertAt == -1 {
			insertAt = len(list)
		}
	}

	result := make([]*Order, 0, len(list)+1)
	result = append(result, list[:insertAt]...)
	result = append(result, order)
	result = append(result, list[insertAt:]...)
	return result
}
