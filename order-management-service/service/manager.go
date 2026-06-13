package service

import (
	"context"
	"sort"
	"sync"
	"time"
)

type OrderType int

const (
	Normal OrderType = iota
	VIP
)

type OrderStatus int

const (
	Pending OrderStatus = iota
	Processing
	Complete
)

type Order struct {
	ID          int         `json:"id"`
	Type        OrderType   `json:"type"`
	Status      OrderStatus `json:"status"`
	CreatedAt   string      `json:"created_at"`
	CompletedAt string      `json:"completed_at,omitempty"`
}

type task struct {
	order         *Order
	ctx           context.Context
	cancel        context.CancelFunc
	originalIndex int
}

type Bot struct {
	ID    int
	taskC chan *task
	stop  chan struct{}
	done  chan struct{}

	mu          sync.Mutex
	busy        bool
	currentTask *task
}

func NewBot(id int) *Bot {
	return &Bot{ID: id, taskC: make(chan *task), stop: make(chan struct{}), done: make(chan struct{})}
}

type Manager struct {
	mu      sync.Mutex
	nextID  int
	orders  map[int]*Order
	pending []*Order
	bots    []*Bot
}

func NewManager() *Manager {
	return &Manager{nextID: 1, orders: make(map[int]*Order)}
}

func (m *Manager) AddOrder(t OrderType) *Order {
	m.mu.Lock()
	defer m.mu.Unlock()
	o := &Order{ID: m.nextID, Type: t, Status: Pending, CreatedAt: time.Now().Format("15:04:05")}
	m.nextID++
	m.orders[o.ID] = o

	if t == VIP {
		idx := 0
		for idx < len(m.pending) && m.pending[idx].Type == VIP {
			idx++
		}
		m.pending = append(m.pending[:idx], append([]*Order{o}, m.pending[idx:]...)...)
	} else {
		m.pending = append(m.pending, o)
	}

	go m.assignAll()
	return o
}

func (m *Manager) assignAll() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.pending) == 0 || len(m.bots) == 0 {
		return
	}
	for i := 0; i < len(m.bots); i++ {
		bot := m.bots[i]
		bot.mu.Lock()
		busy := bot.busy
		bot.mu.Unlock()
		if busy {
			continue
		}
		var ord *Order
		var idx int
		for j, o := range m.pending {
			if o.Status == Pending {
				ord = o
				idx = j
				break
			}
		}
		if ord == nil {
			break
		}
		ord.Status = Processing

		ctx, cancel := context.WithCancel(context.Background())
		t := &task{order: ord, ctx: ctx, cancel: cancel, originalIndex: idx}

		bot.mu.Lock()
		bot.busy = true
		bot.currentTask = t
		bot.mu.Unlock()

		go func(b *Bot, tt *task) {
			select {
			case b.taskC <- tt:
			case <-b.stop:
				tt.cancel()
			}
		}(bot, t)
	}
}

func (m *Manager) completeOrder(id int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if o, ok := m.orders[id]; ok {
		o.Status = Complete
		o.CompletedAt = time.Now().Format("15:04:05")
		for i, p := range m.pending {
			if p.ID == id {
				m.pending = append(m.pending[:i], m.pending[i+1:]...)
				break
			}
		}
	}
}

func (m *Manager) requeueOrder(o *Order, idx int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	found := false
	for _, p := range m.pending {
		if p.ID == o.ID {
			found = true
			break
		}
	}
	o.Status = Pending
	if !found {
		if idx < 0 {
			idx = 0
		}
		if idx > len(m.pending) {
			idx = len(m.pending)
		}
		m.pending = append(m.pending[:idx], append([]*Order{o}, m.pending[idx:]...)...)
	}
}

func (m *Manager) AddBot() *Bot {
	m.mu.Lock()
	defer m.mu.Unlock()
	b := NewBot(len(m.bots) + 1)
	m.bots = append(m.bots, b)
	go m.botLoop(b)
	go m.assignAll()
	return b
}

func (m *Manager) RemoveBot() *Bot {
	m.mu.Lock()
	if len(m.bots) == 0 {
		m.mu.Unlock()
		return nil
	}
	b := m.bots[len(m.bots)-1]
	m.bots = m.bots[:len(m.bots)-1]
	m.mu.Unlock()

	close(b.stop)
	b.mu.Lock()
	if b.currentTask != nil {
		b.currentTask.cancel()
	}
	b.mu.Unlock()

	<-b.done
	go m.assignAll()
	return b
}

func (m *Manager) botLoop(b *Bot) {
	defer close(b.done)
	for {
		select {
		case t := <-b.taskC:
			select {
			case <-time.After(10 * time.Second):
				m.completeOrder(t.order.ID)
			case <-t.ctx.Done():
				m.requeueOrder(t.order, t.originalIndex)
			}
			b.mu.Lock()
			b.busy = false
			b.currentTask = nil
			b.mu.Unlock()
			go m.assignAll()
		case <-b.stop:
			b.mu.Lock()
			if b.currentTask != nil {
				b.currentTask.cancel()
			}
			b.mu.Unlock()
			return
		}
	}
}

type Snapshot struct {
	Orders   []*Order
	Pending  []*Order
	BotCount int
}

func (m *Manager) Snapshot() Snapshot {
	m.mu.Lock()
	defer m.mu.Unlock()
	orders := make([]*Order, 0, len(m.orders))
	for _, o := range m.orders {
		orders = append(orders, o)
	}
	pending := make([]*Order, len(m.pending))
	copy(pending, m.pending)
	return Snapshot{Orders: orders, Pending: pending, BotCount: len(m.bots)}
}

func SortCompleted(orders []*Order) []*Order {
	completed := make([]*Order, 0)
	others := make([]*Order, 0)
	for _, o := range orders {
		if o.Status == Complete {
			completed = append(completed, o)
		} else {
			others = append(others, o)
		}
	}
	// sort completed orders by CompletedAt ascending (oldest first)
	sort.Slice(completed, func(i, j int) bool { return completed[i].CompletedAt < completed[j].CompletedAt })
	sort.Slice(others, func(i, j int) bool { return others[i].ID < others[j].ID })
	return append(completed, others...)
}
