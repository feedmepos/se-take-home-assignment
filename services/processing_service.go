package services

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/usecases"
	"sync"
	"time"
)

// EventType represents types of events emitted by the processing service
type EventType int

const (
	EventOrderPickedUp EventType = iota
	EventOrderCompleted
	EventBotIdle
	EventError
)

// ProcessingEvent represents an event from the processing service
type ProcessingEvent struct {
	Type    EventType
	BotID   int
	Order   *entities.Order
	Message string
}

// EventHandler is a callback function for processing events
type EventHandler func(event ProcessingEvent)

// ProcessingService handles real-time order processing in the background
type ProcessingService struct {
	assignOrdersUC   *usecases.AssignOrdersUseCase
	completeOrdersUC *usecases.CompleteOrdersUseCase
	getStatusUC      *usecases.GetStatusUseCase

	// Track active processing tasks
	activeProcessing map[int]*processingTask // botID -> task
	mu               sync.Mutex

	// Channels for coordination
	triggerChan chan struct{}
	stopChan    chan struct{}
	doneChan    chan struct{}

	// Event handler for notifications
	eventHandler EventHandler

	// Stats tracking
	stats *ProcessingStats
}

type processingTask struct {
	botID   int
	orderID int
	order   *entities.Order
	timer   *time.Timer
	cancel  chan struct{}
}

type ProcessingStats struct {
	mu              sync.Mutex
	OrdersCompleted int
	VVIPCompleted   int
	VIPCompleted    int
	NormalCompleted int
}

func NewProcessingService(
	assignOrdersUC *usecases.AssignOrdersUseCase,
	completeOrdersUC *usecases.CompleteOrdersUseCase,
	getStatusUC *usecases.GetStatusUseCase,
) *ProcessingService {
	return &ProcessingService{
		assignOrdersUC:   assignOrdersUC,
		completeOrdersUC: completeOrdersUC,
		getStatusUC:      getStatusUC,
		activeProcessing: make(map[int]*processingTask),
		triggerChan:      make(chan struct{}, 10),
		stopChan:         make(chan struct{}),
		doneChan:         make(chan struct{}),
		stats:            &ProcessingStats{},
	}
}

// SetEventHandler sets the callback for processing events
func (ps *ProcessingService) SetEventHandler(handler EventHandler) {
	ps.eventHandler = handler
}

// Start begins the background processing loop
func (ps *ProcessingService) Start() {
	go ps.processLoop()
}

// Stop gracefully stops the processing service
func (ps *ProcessingService) Stop() {
	close(ps.stopChan)
	<-ps.doneChan
}

// TriggerProcessing signals that there may be work to do
func (ps *ProcessingService) TriggerProcessing() {
	select {
	case ps.triggerChan <- struct{}{}:
	default:
		// Channel full, processing will happen anyway
	}
}

// CancelBotProcessing cancels processing for a specific bot (when bot is removed)
// Returns the order ID if the bot was processing, 0 otherwise
func (ps *ProcessingService) CancelBotProcessing(botID int) (int, bool) {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	task, exists := ps.activeProcessing[botID]
	if !exists {
		return 0, false
	}

	// Cancel the timer and signal cancellation
	task.timer.Stop()
	close(task.cancel)
	delete(ps.activeProcessing, botID)

	return task.orderID, true
}

// GetStats returns the current processing statistics
func (ps *ProcessingService) GetStats() (completed, vvip, vip, normal int) {
	ps.stats.mu.Lock()
	defer ps.stats.mu.Unlock()
	return ps.stats.OrdersCompleted, ps.stats.VVIPCompleted, ps.stats.VIPCompleted, ps.stats.NormalCompleted
}

// GetActiveProcessingCount returns the number of orders currently being processed
func (ps *ProcessingService) GetActiveProcessingCount() int {
	ps.mu.Lock()
	defer ps.mu.Unlock()
	return len(ps.activeProcessing)
}

func (ps *ProcessingService) emitEvent(event ProcessingEvent) {
	if ps.eventHandler != nil {
		ps.eventHandler(event)
	}
}

func (ps *ProcessingService) processLoop() {
	defer close(ps.doneChan)

	for {
		select {
		case <-ps.stopChan:
			ps.cancelAllProcessing()
			return
		case <-ps.triggerChan:
			ps.tryAssignOrders()
		}
	}
}

func (ps *ProcessingService) tryAssignOrders() {
	// Keep trying to assign while there are idle bots and pending orders
	for {
		status := ps.getStatusUC.Execute()

		// Check if there are idle bots
		hasIdleBot := false
		for _, bot := range status.Bots {
			if !bot.IsProcessing {
				hasIdleBot = true
				break
			}
		}

		if !hasIdleBot || len(status.PendingOrders) == 0 {
			break
		}

		// Try to assign orders
		assigned, err := ps.assignOrdersUC.Execute()
		if err != nil {
			ps.emitEvent(ProcessingEvent{
				Type:    EventError,
				Message: err.Error(),
			})
			return
		}

		if len(assigned) == 0 {
			break
		}

		// Start processing for each assigned order
		for _, r := range assigned {
			ps.emitEvent(ProcessingEvent{
				Type:  EventOrderPickedUp,
				BotID: r.BotID,
				Order: r.Order,
			})
			ps.startProcessing(r.BotID, r.Order)
		}
	}
}

func (ps *ProcessingService) startProcessing(botID int, order *entities.Order) {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	cancel := make(chan struct{})
	timer := time.AfterFunc(order.ProcessingDuration(), func() {
		ps.completeProcessing(botID, order, cancel)
	})

	ps.activeProcessing[botID] = &processingTask{
		botID:   botID,
		orderID: order.ID,
		order:   order,
		timer:   timer,
		cancel:  cancel,
	}
}

func (ps *ProcessingService) completeProcessing(botID int, order *entities.Order, cancel chan struct{}) {
	// Check if cancelled
	select {
	case <-cancel:
		return
	default:
	}

	ps.mu.Lock()
	delete(ps.activeProcessing, botID)
	ps.mu.Unlock()

	// Complete the order
	_, err := ps.completeOrdersUC.Execute(usecases.CompleteOrdersArgs{
		Assignments: []*usecases.AssignOrdersRes{{BotID: botID, Order: order}},
	})

	if err != nil {
		ps.emitEvent(ProcessingEvent{
			Type:    EventError,
			Message: err.Error(),
		})
		return
	}

	ps.emitEvent(ProcessingEvent{
		Type:  EventOrderCompleted,
		BotID: botID,
		Order: order,
	})

	// Update stats
	ps.stats.mu.Lock()
	ps.stats.OrdersCompleted++
	switch order.Type {
	case entities.OrderTypeVVIP:
		ps.stats.VVIPCompleted++
	case entities.OrderTypeVIP:
		ps.stats.VIPCompleted++
	default:
		ps.stats.NormalCompleted++
	}
	ps.stats.mu.Unlock()

	// Check if there are more orders to process
	status := ps.getStatusUC.Execute()
	if len(status.PendingOrders) == 0 {
		ps.emitEvent(ProcessingEvent{
			Type:  EventBotIdle,
			BotID: botID,
		})
	} else {
		// Trigger processing for the next order
		ps.TriggerProcessing()
	}
}

func (ps *ProcessingService) cancelAllProcessing() {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	for _, task := range ps.activeProcessing {
		task.timer.Stop()
		close(task.cancel)
	}
	ps.activeProcessing = make(map[int]*processingTask)
}
