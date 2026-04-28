package domain

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"
)

// Snapshot is a read-only view used by CLI and tests.
type Snapshot struct {
	BotSummaries      []string
	PendingVIPIDs     []int
	PendingNormalIDs  []int
	CompletedOrderIDs []int
}

// Metrics is a compact summary used for final reporting.
type Metrics struct {
	TotalOrders   int
	TotalVIP      int
	TotalNormal   int
	Completed     int
	ActiveBots    int
	PendingOrders int
}

// Controller contains all in-memory state and domain rules.
type Controller struct {
	mu sync.Mutex

	nextOrderID int
	nextSeq     int
	nextBotID   int

	pendingVIP    []*Order
	pendingNormal []*Order
	completed     []*Order
	bots          []*Bot
	completedVIP  int
	completedNorm int

	processingDuration time.Duration
	logf               func(format string, args ...any)
}

// NewController creates a controller with configurable processing duration.
func NewController(processingDuration time.Duration, logf func(format string, args ...any)) *Controller {
	if logf == nil {
		logf = func(string, ...any) {}
	}
	return &Controller{
		nextOrderID:        1000,
		processingDuration: processingDuration,
		logf:               logf,
	}
}

// NewNormalOrder inserts a normal order and triggers scheduling.
func (c *Controller) NewNormalOrder() Order {
	return c.createOrder(OrderTypeNormal)
}

// NewVIPOrder inserts a VIP order and triggers scheduling.
func (c *Controller) NewVIPOrder() Order {
	return c.createOrder(OrderTypeVIP)
}

func (c *Controller) createOrder(orderType OrderType) Order {
	c.mu.Lock()
	c.nextOrderID++
	c.nextSeq++

	order := &Order{
		ID:        c.nextOrderID,
		Sequence:  c.nextSeq,
		Type:      orderType,
		Status:    OrderStatusPending,
		CreatedAt: time.Now(),
	}
	if orderType == OrderTypeVIP {
		c.pendingVIP = append(c.pendingVIP, order)
	} else {
		c.pendingNormal = append(c.pendingNormal, order)
	}
	c.logf("[%s] Created %s Order #%d - Status: %s", hhmmss(), displayOrderType(order.Type), order.ID, order.Status)
	orderCopy := *order
	c.mu.Unlock()

	c.dispatch()
	return orderCopy
}

// AddBot registers a bot and lets it pull pending work immediately.
func (c *Controller) AddBot() Bot {
	c.mu.Lock()
	c.nextBotID++
	bot := &Bot{
		ID:    c.nextBotID,
		State: BotStateIdle,
	}
	c.bots = append(c.bots, bot)
	c.logf("[%s] Bot #%d created - Status: ACTIVE", hhmmss(), bot.ID)
	botCopy := *bot
	c.mu.Unlock()

	c.dispatch()
	return botCopy
}

// RemoveLatestBot removes the most recently added bot.
func (c *Controller) RemoveLatestBot() error {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.mu.Unlock()
		return fmt.Errorf("no bot to remove")
	}

	latestIdx := len(c.bots) - 1
	bot := c.bots[latestIdx]
	c.bots = c.bots[:latestIdx]

	// If the bot is in progress, cancel and re-queue the current order.
	if bot.cancel != nil {
		bot.cancel()
		bot.cancel = nil
	}
	if bot.CurrentOrder != nil && bot.CurrentOrder.Status == OrderStatusProcessing {
		bot.CurrentOrder.Status = OrderStatusPending
		c.enqueuePending(bot.CurrentOrder)
		c.logf("[%s] Bot #%d destroyed while processing Order #%d - Re-queued to PENDING", hhmmss(), bot.ID, bot.CurrentOrder.ID)
	} else {
		c.logf("[%s] Bot #%d destroyed while IDLE", hhmmss(), bot.ID)
	}
	c.mu.Unlock()

	c.dispatch()
	return nil
}

func (c *Controller) enqueuePending(order *Order) {
	if order.Type == OrderTypeVIP {
		c.pendingVIP = append(c.pendingVIP, order)
		sort.SliceStable(c.pendingVIP, func(i, j int) bool {
			return c.pendingVIP[i].Sequence < c.pendingVIP[j].Sequence
		})
		return
	}
	c.pendingNormal = append(c.pendingNormal, order)
	sort.SliceStable(c.pendingNormal, func(i, j int) bool {
		return c.pendingNormal[i].Sequence < c.pendingNormal[j].Sequence
	})
}

// Snapshot returns a consistent state view.
func (c *Controller) Snapshot() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	s := Snapshot{
		BotSummaries:      make([]string, 0, len(c.bots)),
		PendingVIPIDs:     make([]int, 0, len(c.pendingVIP)),
		PendingNormalIDs:  make([]int, 0, len(c.pendingNormal)),
		CompletedOrderIDs: make([]int, 0, len(c.completed)),
	}

	for _, b := range c.bots {
		if b.CurrentOrder != nil {
			s.BotSummaries = append(s.BotSummaries, fmt.Sprintf("bot#%d(%s order#%d)", b.ID, b.State, b.CurrentOrder.ID))
		} else {
			s.BotSummaries = append(s.BotSummaries, fmt.Sprintf("bot#%d(%s)", b.ID, b.State))
		}
	}
	for _, o := range c.pendingVIP {
		s.PendingVIPIDs = append(s.PendingVIPIDs, o.ID)
	}
	for _, o := range c.pendingNormal {
		s.PendingNormalIDs = append(s.PendingNormalIDs, o.ID)
	}
	for _, o := range c.completed {
		s.CompletedOrderIDs = append(s.CompletedOrderIDs, o.ID)
	}
	return s
}

// Metrics returns final summary counters for reporting.
func (c *Controller) Metrics() Metrics {
	c.mu.Lock()
	defer c.mu.Unlock()
	return Metrics{
		TotalOrders:   c.nextOrderID - 1000,
		TotalVIP:      c.completedVIP + len(c.pendingVIP) + c.processingCountByType(OrderTypeVIP),
		TotalNormal:   c.completedNorm + len(c.pendingNormal) + c.processingCountByType(OrderTypeNormal),
		Completed:     len(c.completed),
		ActiveBots:    len(c.bots),
		PendingOrders: len(c.pendingVIP) + len(c.pendingNormal),
	}
}

func (c *Controller) dispatch() {
	for {
		c.mu.Lock()
		bot := c.findIdleBot()
		if bot == nil {
			c.mu.Unlock()
			return
		}
		order := c.pickNextPending()
		if order == nil {
			c.mu.Unlock()
			return
		}

		order.Status = OrderStatusProcessing
		bot.State = BotStateBusy
		bot.CurrentOrder = order

		ctx, cancel := context.WithCancel(context.Background())
		bot.cancel = cancel
		botID := bot.ID
		orderID := order.ID
		c.logf("[%s] Bot #%d picked up %s Order #%d - Status: %s", hhmmss(), botID, displayOrderType(order.Type), orderID, order.Status)
		c.mu.Unlock()

		go c.processOrder(ctx, botID, orderID)
	}
}

func (c *Controller) processOrder(ctx context.Context, botID, orderID int) {
	timer := time.NewTimer(c.processingDuration)
	defer timer.Stop()

	select {
	case <-timer.C:
		c.completeOrder(botID, orderID)
	case <-ctx.Done():
		return
	}
}

func (c *Controller) completeOrder(botID, orderID int) {
	c.mu.Lock()
	defer c.mu.Unlock()

	bot := c.findBotByID(botID)
	if bot == nil || bot.CurrentOrder == nil {
		return
	}
	if bot.CurrentOrder.ID != orderID || bot.CurrentOrder.Status != OrderStatusProcessing {
		return
	}

	bot.CurrentOrder.Status = OrderStatusComplete
	c.completed = append(c.completed, bot.CurrentOrder)
	if bot.CurrentOrder.Type == OrderTypeVIP {
		c.completedVIP++
	} else {
		c.completedNorm++
	}
	c.logf("[%s] Bot #%d completed %s Order #%d - Status: %s (Processing time: %ds)", hhmmss(), botID, displayOrderType(bot.CurrentOrder.Type), orderID, OrderStatusComplete, int(c.processingDuration.Seconds()))

	bot.CurrentOrder = nil
	bot.State = BotStateIdle
	bot.cancel = nil
	if len(c.pendingVIP)+len(c.pendingNormal) == 0 {
		c.logf("[%s] Bot #%d is now IDLE - No pending orders", hhmmss(), botID)
	}

	// Trigger next dispatch in another goroutine to avoid lock re-entry complexity.
	go c.dispatch()
}

func (c *Controller) findIdleBot() *Bot {
	for _, b := range c.bots {
		if b.State == BotStateIdle {
			return b
		}
	}
	return nil
}

func (c *Controller) findBotByID(botID int) *Bot {
	for _, b := range c.bots {
		if b.ID == botID {
			return b
		}
	}
	return nil
}

func (c *Controller) pickNextPending() *Order {
	if len(c.pendingVIP) > 0 {
		order := c.pendingVIP[0]
		c.pendingVIP = c.pendingVIP[1:]
		return order
	}
	if len(c.pendingNormal) > 0 {
		order := c.pendingNormal[0]
		c.pendingNormal = c.pendingNormal[1:]
		return order
	}
	return nil
}

func hhmmss() string {
	return time.Now().Format("15:04:05")
}

func (c *Controller) processingCountByType(orderType OrderType) int {
	count := 0
	for _, b := range c.bots {
		if b.CurrentOrder != nil && b.CurrentOrder.Type == orderType && b.CurrentOrder.Status == OrderStatusProcessing {
			count++
		}
	}
	return count
}

func displayOrderType(orderType OrderType) string {
	if orderType == OrderTypeVIP {
		return "VIP"
	}
	return "Normal"
}
