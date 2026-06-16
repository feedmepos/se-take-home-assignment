package bot

import (
	"sync"
	"time"

	"github.com/se-take-home-assignment/internal/mgr/queue"
	"github.com/se-take-home-assignment/internal/order"
)

type State int

const (
	Idle State = iota
	Processing
	Stopped
)

func (s State) String() string {
	switch s {
	case Idle:
		return "IDLE"
	case Processing:
		return "PROCESSING"
	case Stopped:
		return "STOPPED"
	default:
		return "UNKNOWN"
	}
}

type Bot struct {
	ID           int
	State        State
	CurrentOrder *order.Order
	stopCh       chan struct{}
	q            queue.OrderQueue
	mu           sync.RWMutex
}

type OrderEventHandler func(eventType string, o *order.Order, botID int)

type Manager struct {
	bots    []*Bot
	nextID  int
	q       queue.OrderQueue
	handler OrderEventHandler
	mu      sync.Mutex
}

func NewManager(q queue.OrderQueue, handler OrderEventHandler) *Manager {
	return &Manager{q: q, handler: handler, nextID: 1}
}

func (m *Manager) AddBot() *Bot {
	m.mu.Lock()
	defer m.mu.Unlock()

	b := &Bot{
		ID:     m.nextID,
		State:  Idle,
		stopCh: make(chan struct{}),
		q:      m.q,
	}
	m.nextID++
	m.bots = append(m.bots, b)
	go b.Run(m.handler)
	return b
}

func (m *Manager) RemoveBot() *Bot {
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.bots) == 0 {
		return nil
	}

	b := m.bots[len(m.bots)-1]
	m.bots = m.bots[:len(m.bots)-1]
	close(b.stopCh)
	return b
}

func (m *Manager) Bots() []*Bot {
	m.mu.Lock()
	defer m.mu.Unlock()
	result := make([]*Bot, len(m.bots))
	copy(result, m.bots)
	return result
}

func (m *Manager) Shutdown() {
	m.mu.Lock()
	bots := make([]*Bot, len(m.bots))
	copy(bots, m.bots)
	m.bots = nil
	m.mu.Unlock()

	for _, b := range bots {
		close(b.stopCh)
	}
}

func (b *Bot) Run(handler OrderEventHandler) {
	for {
		b.setState(Idle, nil)

		o := b.q.Dequeue(b.stopCh)
		if o == nil {
			b.setState(Stopped, nil)
			return
		}

		b.setState(Processing, o)
		if handler != nil {
			handler("processing", o, b.ID)
		}

		select {
		case <-time.After(10 * time.Second):
			b.q.CompleteOrder(o)
			if handler != nil {
				handler("completed", o, b.ID)
			}
		case <-b.stopCh:
			b.q.RecycleOrder(o)
			if handler != nil {
				handler("recycled", o, b.ID)
			}
			b.setState(Stopped, nil)
			return
		}
	}
}

func (b *Bot) setState(s State, o *order.Order) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.State = s
	b.CurrentOrder = o
}
