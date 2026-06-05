package controller

import (
	"fmt"
	"sync"
	"time"
)

type OrderType int

const (
	OrderNormal OrderType = iota
	OrderVIP
)

func (t OrderType) String() string {
	switch t {
	case OrderNormal:
		return "Normal"
	case OrderVIP:
		return "VIP"
	}
	return "Unknown"
}

type OrderStatus int

const (
	OrderPending OrderStatus = iota
	OrderProcessing
	OrderComplete
)

func (s OrderStatus) String() string {
	switch s {
	case OrderPending:
		return "PENDING"
	case OrderProcessing:
		return "PROCESSING"
	case OrderComplete:
		return "COMPLETE"
	}
	return "UNKNOWN"
}

type Order struct {
	ID        int
	Type      OrderType
	Status    OrderStatus
	CreatedAt time.Time
	StartedAt *time.Time
}

type Bot struct {
	ID     int
	order  *Order
	stopCh chan struct{}
}

type Controller struct {
	mu sync.Mutex

	nextOrderID int
	nextBotID   int

	vipQueue    []*Order
	normalQueue []*Order
	completed   []*Order
	bots        []*Bot

	orderCh chan struct{}
}

func New() *Controller {
	return &Controller{
		nextOrderID: 1001,
		nextBotID:   1,
		orderCh:     make(chan struct{}, 1),
	}
}

func (c *Controller) AddNormalOrder() *Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	order := &Order{
		ID:        c.nextOrderID,
		Type:      OrderNormal,
		Status:    OrderPending,
		CreatedAt: time.Now(),
	}
	c.nextOrderID++
	c.normalQueue = append(c.normalQueue, order)
	c.notifyBots()
	return order
}

func (c *Controller) AddVIPOrder() *Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	order := &Order{
		ID:        c.nextOrderID,
		Type:      OrderVIP,
		Status:    OrderPending,
		CreatedAt: time.Now(),
	}
	c.nextOrderID++
	c.vipQueue = append(c.vipQueue, order)
	c.notifyBots()
	return order
}

func (c *Controller) AddBot() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()

	bot := &Bot{
		ID:     c.nextBotID,
		stopCh: make(chan struct{}),
	}
	c.nextBotID++
	c.bots = append(c.bots, bot)
	go c.botLoop(bot)
	return bot
}

func (c *Controller) RemoveBot() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.bots) == 0 {
		return nil
	}

	bot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	close(bot.stopCh)

	if bot.order != nil {
		order := bot.order
		order.Status = OrderPending
		order.StartedAt = nil
		bot.order = nil
		if order.Type == OrderVIP {
			c.vipQueue = append([]*Order{order}, c.vipQueue...)
		} else {
			c.normalQueue = append([]*Order{order}, c.normalQueue...)
		}
	}

	return bot
}

func (c *Controller) CompletedCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.completed)
}

func (c *Controller) BotCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.bots)
}

func (c *Controller) Status() string {
	c.mu.Lock()
	defer c.mu.Unlock()

	pendingCount := len(c.vipQueue) + len(c.normalQueue)
	activeBots := 0
	idleBots := 0
	for _, b := range c.bots {
		if b.order != nil {
			activeBots++
		} else {
			idleBots++
		}
	}

	s := fmt.Sprintf("Orders: %d pending, %d completed | Bots: %d active, %d idle",
		pendingCount, len(c.completed), activeBots, idleBots)

	if len(c.vipQueue) > 0 {
		s += "\nVIP Queue: ["
		for i, o := range c.vipQueue {
			if i > 0 {
				s += ", "
			}
			s += fmt.Sprintf("#%d", o.ID)
		}
		s += "]"
	}
	if len(c.normalQueue) > 0 {
		s += "\nNormal Queue: ["
		for i, o := range c.normalQueue {
			if i > 0 {
				s += ", "
			}
			s += fmt.Sprintf("#%d", o.ID)
		}
		s += "]"
	}

	return s
}

func (c *Controller) popNextOrder() *Order {
	if len(c.vipQueue) > 0 {
		o := c.vipQueue[0]
		c.vipQueue = c.vipQueue[1:]
		return o
	}
	if len(c.normalQueue) > 0 {
		o := c.normalQueue[0]
		c.normalQueue = c.normalQueue[1:]
		return o
	}
	return nil
}

func (c *Controller) notifyBots() {
	select {
	case c.orderCh <- struct{}{}:
	default:
	}
}

func (c *Controller) botLoop(bot *Bot) {
	for {
		c.mu.Lock()
		order := c.popNextOrder()
		if order == nil {
			c.mu.Unlock()
			select {
			case <-c.orderCh:
				continue
			case <-bot.stopCh:
				return
			}
		}

		order.Status = OrderProcessing
		now := time.Now()
		order.StartedAt = &now
		bot.order = order
		c.mu.Unlock()

		select {
		case <-time.After(10 * time.Second):
		case <-bot.stopCh:
			c.mu.Lock()
			order.Status = OrderPending
			order.StartedAt = nil
			bot.order = nil
			if order.Type == OrderVIP {
				c.vipQueue = append([]*Order{order}, c.vipQueue...)
			} else {
				c.normalQueue = append([]*Order{order}, c.normalQueue...)
			}
			c.mu.Unlock()
			return
		}

		c.mu.Lock()
		order.Status = OrderComplete
		bot.order = nil
		c.completed = append(c.completed, order)
		c.mu.Unlock()
	}
}
