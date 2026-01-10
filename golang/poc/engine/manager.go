package engine

import (
	"context"
	"sync"
	"time"
)

type bot struct {
	id     int
	state  BotState
	cancel context.CancelFunc
}

type Manager struct {
	mu sync.Mutex

	queue      *OrderQueue
	events     chan<- Event
	processDur time.Duration

	nextBotID int
	bots      []bot

	// Stats
	completedVIP    int
	completedNormal int
	totalCompleted  int
}

func NewManager(queue *OrderQueue, events chan<- Event, processDur time.Duration) *Manager {
	return &Manager{
		queue:      queue,
		events:     events,
		processDur: processDur,
		nextBotID:  1,
		bots:       make([]bot, 0),
	}
}

func (m *Manager) BotsCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.bots)
}

func (m *Manager) Stats() (total, vip, normal int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.totalCompleted, m.completedVIP, m.completedNormal
}

func (m *Manager) AddBot() {
	m.mu.Lock()
	id := m.nextBotID
	m.nextBotID++

	ctx, cancel := context.WithCancel(context.Background())
	b := bot{id: id, state: Idle, cancel: cancel}
	m.bots = append(m.bots, b)
	botsCount := len(m.bots)
	m.mu.Unlock()

	m.events <- Event{Type: EvtBotAdded, BotID: id, BotsCount: botsCount}

	go m.workerLoop(ctx, id)
}

func (m *Manager) RemoveNewestBot() {
	m.mu.Lock()
	if len(m.bots) == 0 {
		m.mu.Unlock()
		return
	}
	// pop newest
	last := m.bots[len(m.bots)-1]
	m.bots = m.bots[:len(m.bots)-1]
	botsCount := len(m.bots)
	m.mu.Unlock()

	// cancel worker; if it was processing, it will emit cancelled (we handle inside loop)
	last.cancel()
	m.events <- Event{Type: EvtBotRemoved, BotID: last.id, BotsCount: botsCount}
}

func (m *Manager) NotifyNewOrder() {
	// No-op in this design; bots continuously pull when idle.
	// Kept to match the mental model.
}

func (m *Manager) workerLoop(ctx context.Context, botID int) {
	for {
		// Check cancellation before picking work
		select {
		case <-ctx.Done():
			return
		default:
		}

		// Try dequeue
		order, ok := m.queue.Dequeue()
		if !ok {
			// idle polling
			m.events <- Event{Type: EvtBotIdle, BotID: botID}
			select {
			case <-ctx.Done():
				return
			case <-time.After(500 * time.Millisecond):
				continue
			}
		}

		order.Status = Processing
		m.events <- Event{Type: EvtOrderPicked, BotID: botID, OrderID: order.ID, Privilege: order.Privilege}

		// Process with cancel support
		start := time.Now()
		timer := time.NewTimer(m.processDur)

		select {
		case <-ctx.Done():
			if !timer.Stop() {
				<-timer.C
			}
			// Return order to pending
			order.Status = Pending
			m.queue.Enqueue(order)
			m.events <- Event{Type: EvtBotCancelled, BotID: botID, OrderID: order.ID, Privilege: order.Privilege}
			return
		case <-timer.C:
			_ = start
		}

		order.Status = Complete

		// Update stats
		m.mu.Lock()
		m.totalCompleted++
		if order.Privilege == VIP {
			m.completedVIP++
		} else {
			m.completedNormal++
		}
		m.mu.Unlock()

		m.events <- Event{
			Type:         EvtOrderCompleted,
			BotID:        botID,
			OrderID:      order.ID,
			Privilege:    order.Privilege,
			ProcessingMS: int64(m.processDur / time.Millisecond),
		}
	}
}
