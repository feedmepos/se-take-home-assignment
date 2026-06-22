package order

import (
	"errors"
	"sort"
	"time"

	"se-take-home-assignment/internal/types"
)

// Controller owns the in-memory order and bot state.
type Controller struct {
	now         time.Time
	nextOrderID int
	nextBotID   int
	pending     []types.Order
	processing  map[int]types.Order
	complete    []types.Order
	bots        []types.Bot
}

// NewController creates a controller with a deterministic starting time.
func NewController(start time.Time) *Controller {
	return &Controller{
		now:        start,
		processing: make(map[int]types.Order),
	}
}

// Now returns the controller's simulated time.
func (c *Controller) Now() time.Time {
	return c.now
}

// AddOrder creates a new order and assigns it to an idle bot when possible.
func (c *Controller) AddOrder(orderType types.OrderType) []types.Event {
	c.nextOrderID++
	next := types.Order{
		ID:        c.nextOrderID,
		Type:      orderType,
		Status:    types.StatusPending,
		CreatedAt: c.now,
	}
	c.pending = insertPending(c.pending, next)

	events := []types.Event{{
		Kind:      types.EventOrderPending,
		At:        c.now,
		OrderID:   next.ID,
		OrderType: next.Type,
	}}
	events = append(events, c.assignIdleBots()...)
	return events
}

// AddBot creates a bot and immediately starts a pending order when possible.
func (c *Controller) AddBot() []types.Event {
	c.nextBotID++
	bot := types.Bot{ID: c.nextBotID}
	c.bots = append(c.bots, bot)

	events := []types.Event{{Kind: types.EventBotAdded, At: c.now, BotID: bot.ID}}
	events = append(events, c.assignBot(len(c.bots)-1)...)
	return events
}

// RemoveBot removes the newest bot. A busy bot's order returns to pending.
func (c *Controller) RemoveBot() ([]types.Event, error) {
	if len(c.bots) == 0 {
		return nil, errors.New("no bot to remove")
	}

	idx := len(c.bots) - 1
	bot := c.bots[idx]
	c.bots = c.bots[:idx]

	events := []types.Event{{Kind: types.EventBotRemoved, At: c.now, BotID: bot.ID}}
	if bot.OrderID == 0 {
		return events, nil
	}

	processing, ok := c.processing[bot.ID]
	if !ok {
		return events, nil
	}
	delete(c.processing, bot.ID)
	c.pending = insertPending(c.pending, processing)
	events = append(events, types.Event{
		Kind:      types.EventOrderRequeued,
		At:        c.now,
		OrderID:   processing.ID,
		OrderType: processing.Type,
		BotID:     bot.ID,
	})
	return events, nil
}

// Advance moves simulated time forward and completes all due orders.
func (c *Controller) Advance(d time.Duration) []types.Event {
	if d <= 0 {
		return nil
	}

	target := c.now.Add(d)
	var events []types.Event
	for {
		dueAt, ok := c.nextDueAt(target)
		if !ok {
			c.now = target
			return events
		}

		c.now = dueAt
		for _, botIdx := range c.dueBotIndexes(dueAt) {
			bot := c.bots[botIdx]
			processing := c.processing[bot.ID]
			processing.Status = types.StatusComplete
			processing.CompletedAt = c.now
			c.complete = append(c.complete, processing)
			delete(c.processing, bot.ID)
			c.bots[botIdx].OrderID = 0
			events = append(events, types.Event{
				Kind:      types.EventOrderCompleted,
				At:        c.now,
				OrderID:   processing.ID,
				OrderType: processing.Type,
				BotID:     bot.ID,
			})
			events = append(events, c.assignBot(botIdx)...)
		}
	}
}

// Snapshot returns copies of current state.
func (c *Controller) Snapshot() types.Snapshot {
	processing := make([]types.Processing, 0, len(c.processing))
	for _, bot := range c.bots {
		if bot.OrderID == 0 {
			continue
		}
		processing = append(processing, types.Processing{BotID: bot.ID, Order: c.processing[bot.ID]})
	}

	return types.Snapshot{
		Now:        c.now,
		Pending:    append([]types.Order(nil), c.pending...),
		Processing: processing,
		Complete:   append([]types.Order(nil), c.complete...),
		Bots:       append([]types.Bot(nil), c.bots...),
	}
}

func (c *Controller) assignIdleBots() []types.Event {
	var events []types.Event
	for idx := range c.bots {
		if len(c.pending) == 0 {
			return events
		}
		if c.bots[idx].OrderID != 0 {
			continue
		}
		events = append(events, c.assignBot(idx)...)
	}
	return events
}

func (c *Controller) assignBot(botIdx int) []types.Event {
	if botIdx < 0 || botIdx >= len(c.bots) || len(c.pending) == 0 {
		return nil
	}
	if c.bots[botIdx].OrderID != 0 {
		return nil
	}

	next := c.pending[0]
	c.pending = c.pending[1:]
	next.Status = types.StatusProcessing
	next.StartedAt = c.now
	c.bots[botIdx].OrderID = next.ID
	c.processing[c.bots[botIdx].ID] = next
	return []types.Event{{
		Kind:      types.EventBotStarted,
		At:        c.now,
		OrderID:   next.ID,
		OrderType: next.Type,
		BotID:     c.bots[botIdx].ID,
	}}
}

func (c *Controller) nextDueAt(target time.Time) (time.Time, bool) {
	var next time.Time
	for _, processing := range c.processing {
		dueAt := processing.StartedAt.Add(types.ProcessingDuration)
		if dueAt.After(target) {
			continue
		}
		if next.IsZero() || dueAt.Before(next) {
			next = dueAt
		}
	}
	return next, !next.IsZero()
}

func (c *Controller) dueBotIndexes(dueAt time.Time) []int {
	var indexes []int
	for idx, bot := range c.bots {
		if bot.OrderID == 0 {
			continue
		}
		processing := c.processing[bot.ID]
		if processing.StartedAt.Add(types.ProcessingDuration).Equal(dueAt) {
			indexes = append(indexes, idx)
		}
	}
	sort.Slice(indexes, func(i, j int) bool {
		return c.bots[indexes[i]].ID < c.bots[indexes[j]].ID
	})
	return indexes
}
