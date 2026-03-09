package bot

import (
	"context"
	"sync"
	"time"

	"github.com/hwakman/se-take-home-assignment/internal/domain"
	"github.com/hwakman/se-take-home-assignment/internal/queue"
)

// BotManager manages the lifecycle and task assignment of worker bots
type BotManager struct {
	mu           sync.Mutex
	bots         map[int]*BotWorker
	orderQueue   *queue.OrderQueue
	nextBotID    int
	onComplete      func(*domain.Order)
	onOrderBack     func(*domain.Order)
	onStart         func(*domain.Order, int)
	ProcessDuration time.Duration
}

// BotWorker represents an individual unit of work running in its own goroutine
type BotWorker struct {
	ID        int
	Cancel    context.CancelFunc
	Status    domain.BotStatus
	CurrentID int
}

func NewBotManager(q *queue.OrderQueue, onComplete func(*domain.Order), onOrderBack func(*domain.Order), onStart func(*domain.Order, int)) *BotManager {
	return &BotManager{
		bots:            make(map[int]*BotWorker),
		orderQueue:      q,
		nextBotID:       1,
		onComplete:      onComplete,
		onOrderBack:     onOrderBack,
		onStart:         onStart,
		ProcessDuration: 10 * time.Second,
	}
}

func (m *BotManager) AddBot() int {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := m.nextBotID
	m.nextBotID++

	ctx, cancel := context.WithCancel(context.Background())
	worker := &BotWorker{
		ID:     id,
		Cancel: cancel,
		Status: domain.BotStatusIdle,
	}
	m.bots[id] = worker

	go m.runWorker(ctx, worker)

	return id
}

// SetBotCount scales the number of running workers to the desired count
func (m *BotManager) SetBotCount(count int) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if count < 0 {
		count = 0
	}
	if count > 100 {
		count = 100
	}

	currentCount := len(m.bots)
	if count > currentCount {
		// Add bots
		for i := 0; i < count-currentCount; i++ {
			id := m.nextBotID
			m.nextBotID++

			ctx, cancel := context.WithCancel(context.Background())
			worker := &BotWorker{
				ID:     id,
				Cancel: cancel,
				Status: domain.BotStatusIdle,
			}
			m.bots[id] = worker
			go m.runWorker(ctx, worker)
		}
	} else if count < currentCount {
		// Remove bots (newest first)
		for i := 0; i < currentCount-count; i++ {
			maxID := -1
			for id := range m.bots {
				if id > maxID {
					maxID = id
				}
			}
			if maxID != -1 {
				m.bots[maxID].Cancel()
				delete(m.bots, maxID)
			}
		}
	}
}

func (m *BotManager) BotCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.bots)
}

// runWorker is the main loop for a bot - it polls the queue and processes orders
func (m *BotManager) runWorker(ctx context.Context, worker *BotWorker) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			order := m.orderQueue.Pop()
			if order == nil {
				worker.Status = domain.BotStatusIdle
				worker.CurrentID = 0
				time.Sleep(500 * time.Millisecond) // Poll queue
				continue
			}

			// Process order
			worker.Status = domain.BotStatusProcessing
			worker.CurrentID = order.ID
			m.onStart(order, worker.ID)

			success := m.processOrder(ctx, order)
			if success {
				worker.Status = domain.BotStatusIdle
				worker.CurrentID = 0
				m.onComplete(order)
			} else {
				// Cancelled
				m.onOrderBack(order)
				return
			}
		}
	}
}

func (m *BotManager) processOrder(ctx context.Context, order *domain.Order) bool {
	timer := time.NewTimer(m.ProcessDuration)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}

func (m *BotManager) GetBots() []*domain.Bot {
	m.mu.Lock()
	defer m.mu.Unlock()

	res := make([]*domain.Bot, 0, len(m.bots))
	for _, b := range m.bots {
		res = append(res, &domain.Bot{
			ID:             b.ID,
			Status:         b.Status,
			CurrentOrderID: b.CurrentID,
		})
	}
	return res
}
