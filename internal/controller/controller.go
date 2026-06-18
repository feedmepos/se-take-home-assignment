package controller

import (
	"fmt"
	"sort"
	"time"
)

const ProcessingDuration = 10 * time.Second

type OrderType string

const (
	NormalOrder OrderType = "NORMAL"
	VIPOrder    OrderType = "VIP"
)

type OrderStatus string

const (
	PendingStatus    OrderStatus = "PENDING"
	ProcessingStatus OrderStatus = "PROCESSING"
	CompleteStatus   OrderStatus = "COMPLETE"
)

type BotStatus string

const (
	IdleStatus          BotStatus = "IDLE"
	BotProcessingStatus BotStatus = "PROCESSING"
)

type Order struct {
	ID            int
	Type          OrderType
	Status        OrderStatus
	CreatedAt     time.Time
	StartedAt     time.Time
	CompletedAt   time.Time
	AssignedBotID int
}

type Bot struct {
	ID             int
	Status         BotStatus
	CurrentOrderID int
	StartedAt      time.Time
}

type Event struct {
	Time    time.Time
	Message string
}

type BotSnapshot struct {
	ID             int
	Status         BotStatus
	CurrentOrderID int
	CurrentType    OrderType
	StartedAt      time.Time
	Remaining      time.Duration
}

type Snapshot struct {
	Now       time.Time
	Pending   []Order
	Bots      []BotSnapshot
	Completed []Order
	Events    []Event
}

type Controller struct {
	nextOrderID int
	nextBotID   int

	orders map[int]*Order
	bots   []*Bot

	vipQueue    []int
	normalQueue []int
	completed   []int
	events      []Event
}

func New() *Controller {
	return &Controller{
		nextOrderID: 1,
		nextBotID:   1,
		orders:      make(map[int]*Order),
	}
}

func (c *Controller) CreateOrder(orderType OrderType, now time.Time) Order {
	if orderType != VIPOrder {
		orderType = NormalOrder
	}

	order := &Order{
		ID:        c.nextOrderID,
		Type:      orderType,
		Status:    PendingStatus,
		CreatedAt: now,
	}
	c.nextOrderID++
	c.orders[order.ID] = order
	c.insertPending(order.ID)
	c.addEvent(now, "Created %s order #%d", order.Type, order.ID)
	c.schedule(now)

	return *order
}

func (c *Controller) AddBot(now time.Time) Bot {
	bot := &Bot{
		ID:     c.nextBotID,
		Status: IdleStatus,
	}
	c.nextBotID++
	c.bots = append(c.bots, bot)
	c.addEvent(now, "Added Bot #%d", bot.ID)
	c.schedule(now)

	return *bot
}

func (c *Controller) RemoveNewestBot(now time.Time) (Bot, bool) {
	if len(c.bots) == 0 {
		c.addEvent(now, "No bot to remove")
		return Bot{}, false
	}

	removed := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]

	if removed.Status == BotProcessingStatus {
		order := c.orders[removed.CurrentOrderID]
		if order != nil && order.Status == ProcessingStatus && order.AssignedBotID == removed.ID {
			order.Status = PendingStatus
			order.AssignedBotID = 0
			order.StartedAt = time.Time{}
			c.insertPending(order.ID)
			c.addEvent(now, "Removed Bot #%d; returned %s order #%d to PENDING", removed.ID, order.Type, order.ID)
			c.schedule(now)
			return *removed, true
		}
	}

	c.addEvent(now, "Removed idle Bot #%d", removed.ID)
	return *removed, true
}

func (c *Controller) Tick(now time.Time) {
	completedBotIDs := make([]int, 0)

	for _, bot := range c.bots {
		if bot.Status != BotProcessingStatus {
			continue
		}
		if now.Sub(bot.StartedAt) < ProcessingDuration {
			continue
		}

		order := c.orders[bot.CurrentOrderID]
		if order == nil || order.Status != ProcessingStatus || order.AssignedBotID != bot.ID {
			continue
		}

		order.Status = CompleteStatus
		order.CompletedAt = now
		order.AssignedBotID = 0
		c.completed = append(c.completed, order.ID)
		c.addEvent(now, "Completed %s order #%d", order.Type, order.ID)

		bot.Status = IdleStatus
		bot.CurrentOrderID = 0
		bot.StartedAt = time.Time{}
		completedBotIDs = append(completedBotIDs, bot.ID)
	}

	c.schedule(now)

	for _, botID := range completedBotIDs {
		if bot := c.findBot(botID); bot != nil && bot.Status == IdleStatus {
			c.addEvent(now, "Bot #%d is now IDLE - no pending orders", bot.ID)
		}
	}
}

func (c *Controller) Snapshot(now time.Time) Snapshot {
	pending := make([]Order, 0, len(c.vipQueue)+len(c.normalQueue))
	for _, id := range c.vipQueue {
		pending = append(pending, c.copyOrder(id))
	}
	for _, id := range c.normalQueue {
		pending = append(pending, c.copyOrder(id))
	}

	bots := make([]BotSnapshot, 0, len(c.bots))
	for _, bot := range c.bots {
		snapshot := BotSnapshot{
			ID:             bot.ID,
			Status:         bot.Status,
			CurrentOrderID: bot.CurrentOrderID,
			StartedAt:      bot.StartedAt,
		}
		if bot.Status == BotProcessingStatus {
			order := c.orders[bot.CurrentOrderID]
			if order != nil {
				snapshot.CurrentType = order.Type
			}
			remaining := ProcessingDuration - now.Sub(bot.StartedAt)
			if remaining < 0 {
				remaining = 0
			}
			snapshot.Remaining = remaining
		}
		bots = append(bots, snapshot)
	}

	completed := make([]Order, 0, len(c.completed))
	for _, id := range c.completed {
		completed = append(completed, c.copyOrder(id))
	}

	events := make([]Event, len(c.events))
	copy(events, c.events)

	return Snapshot{
		Now:       now,
		Pending:   pending,
		Bots:      bots,
		Completed: completed,
		Events:    events,
	}
}

func (c *Controller) schedule(now time.Time) {
	for _, bot := range c.bots {
		if bot.Status != IdleStatus {
			continue
		}

		orderID, ok := c.popNextPending()
		if !ok {
			return
		}

		order := c.orders[orderID]
		if order == nil || order.Status != PendingStatus {
			continue
		}

		order.Status = ProcessingStatus
		order.StartedAt = now
		order.AssignedBotID = bot.ID

		bot.Status = BotProcessingStatus
		bot.CurrentOrderID = order.ID
		bot.StartedAt = now

		c.addEvent(now, "Bot #%d picked up %s order #%d", bot.ID, order.Type, order.ID)
	}
}

func (c *Controller) insertPending(orderID int) {
	order := c.orders[orderID]
	if order == nil {
		return
	}

	queue := &c.normalQueue
	if order.Type == VIPOrder {
		queue = &c.vipQueue
	}

	for _, existingID := range *queue {
		if existingID == orderID {
			return
		}
	}

	index := sort.Search(len(*queue), func(i int) bool {
		return (*queue)[i] > orderID
	})
	*queue = append(*queue, 0)
	copy((*queue)[index+1:], (*queue)[index:])
	(*queue)[index] = orderID
}

func (c *Controller) popNextPending() (int, bool) {
	if len(c.vipQueue) > 0 {
		id := c.vipQueue[0]
		c.vipQueue = c.vipQueue[1:]
		return id, true
	}
	if len(c.normalQueue) > 0 {
		id := c.normalQueue[0]
		c.normalQueue = c.normalQueue[1:]
		return id, true
	}
	return 0, false
}

func (c *Controller) copyOrder(id int) Order {
	order := c.orders[id]
	if order == nil {
		return Order{}
	}
	return *order
}

func (c *Controller) findBot(id int) *Bot {
	for _, bot := range c.bots {
		if bot.ID == id {
			return bot
		}
	}
	return nil
}

func (c *Controller) addEvent(now time.Time, format string, args ...any) {
	c.events = append(c.events, Event{
		Time:    now,
		Message: fmt.Sprintf(format, args...),
	})
}
