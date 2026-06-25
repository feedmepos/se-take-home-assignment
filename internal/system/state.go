package system

import (
	"fmt"
	"sync"
	"time"

	"McDonald/internal/model"
	"McDonald/internal/output"
	"McDonald/internal/queue"
)

const ProcessingDuration = 10 * time.Second

// SystemState manages the order queue and bots
type SystemState struct {
	mu       sync.Mutex
	orderID  int
	botID    int
	pending  *queue.PriorityQueue
	complete []*model.Order
	bots     map[int]*model.Bot
	writer   *output.Writer
}

// NewSystemState creates a new system state
func NewSystemState(writer *output.Writer) *SystemState {
	return &SystemState{
		pending:  queue.NewPriorityQueue(),
		complete: make([]*model.Order, 0),
		bots:     make(map[int]*model.Bot),
		writer:   writer,
	}
}

// CreateOrder creates a new order
func (s *SystemState) CreateOrder(orderType model.OrderType) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.orderID++
	order := &model.Order{
		ID:        s.orderID,
		Type:      orderType,
		Status:    model.OrderStatusPending,
		CreatedAt: time.Now(),
	}

	s.pending.Enqueue(order)
	s.writer.OrderCreated(order)

	// Try to assign to an idle bot
	s.assignToIdleBot()
}

// AddBot creates a new bot
func (s *SystemState) AddBot() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.botID++
	bot := &model.Bot{
		ID:       s.botID,
		Status:   model.BotStatusIdle,
		StopChan: make(chan struct{}),
	}

	s.bots[bot.ID] = bot
	s.writer.BotCreated(bot)

	// Try to assign an order to this bot
	s.assignOrderToBot(bot)
}

// RemoveBot removes the newest bot
func (s *SystemState) RemoveBot() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.bots) == 0 {
		s.writer.NoBotToRemove()
		return
	}

	// Find the newest bot (highest ID)
	var newestBot *model.Bot
	for _, bot := range s.bots {
		if newestBot == nil || bot.ID > newestBot.ID {
			newestBot = bot
		}
	}

	if newestBot == nil {
		return
	}

	// Stop the bot if it's processing
	returnedOrder := false
	if newestBot.Status == model.BotStatusProcessing {
		newestBot.Timer.Stop()
		if newestBot.Current != nil {
			order := newestBot.Current
			order.Status = model.OrderStatusPending
			order.StartTime = nil
			// Return order to pending queue
			s.pending.InsertAtEnd(order)
			returnedOrder = true
		}
	}

	// Remove the bot
	delete(s.bots, newestBot.ID)
	s.writer.BotRemoved(newestBot, returnedOrder)
}

// assignToIdleBot tries to assign an order to any idle bot
func (s *SystemState) assignToIdleBot() {
	for _, bot := range s.bots {
		if bot.Status == model.BotStatusIdle {
			s.assignOrderToBot(bot)
			break
		}
	}
}

// assignOrderToBot assigns the next pending order to a specific bot
func (s *SystemState) assignOrderToBot(bot *model.Bot) {
	if bot.Status != model.BotStatusIdle {
		return
	}

	order := s.pending.Dequeue()
	if order == nil {
		s.writer.BotIdle(bot)
		return
	}

	// Start processing
	bot.Status = model.BotStatusProcessing
	bot.Current = order
	order.Status = model.OrderStatusProcessing
	now := time.Now()
	order.StartTime = &now

	s.writer.BotProcessing(bot, order)

	// Start 10 second timer
	bot.Timer = time.AfterFunc(ProcessingDuration, func() {
		s.completeOrder(bot, order)
	})
}

// completeOrder marks an order as complete
func (s *SystemState) completeOrder(bot *model.Bot, order *model.Order) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	order.EndTime = &now
	order.Status = model.OrderStatusComplete

	// Add to complete list
	s.complete = append(s.complete, order)

	// Bot becomes idle
	bot.Status = model.BotStatusIdle
	bot.Current = nil

	s.writer.OrderComplete(order, bot.ID)

	// Try to process next order
	s.assignOrderToBot(bot)
}

// PrintStatus prints the current system status
func (s *SystemState) PrintStatus() {
	s.mu.Lock()
	defer s.mu.Unlock()

	var status string

	// Print pending orders
	status += fmt.Sprintf("PENDING (%d):\n", s.pending.Len())
	for _, order := range s.pending.GetOrders() {
		status += fmt.Sprintf("  #%d %s %s\n", order.ID, order.TypeString(), order.StatusString())
	}

	// Print processing orders
	status += fmt.Sprintf("PROCESSING (%d):\n", s.countProcessing())
	for _, bot := range s.bots {
		if bot.Status == model.BotStatusProcessing && bot.Current != nil {
			status += fmt.Sprintf("  Bot #%d: Order #%d (%s)\n", bot.ID, bot.Current.ID, bot.Current.TypeString())
		}
	}

	// Print completed orders
	status += fmt.Sprintf("COMPLETE (%d):\n", len(s.complete))
	for i, order := range s.complete {
		if i >= 10 {
			status += fmt.Sprintf("  ... and %d more\n", len(s.complete)-10)
			break
		}
		endTime := "N/A"
		if order.EndTime != nil {
			endTime = order.EndTime.Format("15:04:05")
		}
		status += fmt.Sprintf("  #%d %s %s\n", order.ID, order.TypeString(), endTime)
	}

	// Print bots
	status += fmt.Sprintf("BOTS (%d):\n", len(s.bots))
	for _, bot := range s.bots {
		orderInfo := "idle"
		if bot.Current != nil {
			orderInfo = fmt.Sprintf("Order #%d (%s)", bot.Current.ID, bot.Current.TypeString())
		}
		status += fmt.Sprintf("  Bot #%d: %s - %s\n", bot.ID, bot.StatusString(), orderInfo)
	}

	s.writer.Status(status)
}

// countProcessing returns the number of bots currently processing
func (s *SystemState) countProcessing() int {
	count := 0
	for _, bot := range s.bots {
		if bot.Status == model.BotStatusProcessing {
			count++
		}
	}
	return count
}
