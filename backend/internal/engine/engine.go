package engine

import (
	"sync"
	"time"

	"github.com/feedme/order-controller/internal/core"
)

type Event struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type State struct {
	PendingOrders   []*core.Order `json:"pending_orders"`
	CompletedOrders []*core.Order `json:"completed_orders"`
	Bots            []*core.Bot   `json:"bots"`
}

type botHandle struct {
	bot    *core.Bot
	notify chan struct{}
	stop   chan struct{}
}

type Engine struct {
	mu             sync.Mutex
	queue          *core.OrderQueue
	bots           []*botHandle
	completed      []*core.Order
	nextBotID      int
	processTime    time.Duration
	eventListeners []func(Event)
}

func New(processTime time.Duration) *Engine {
	return &Engine{
		queue:       core.NewOrderQueue(),
		nextBotID:   1,
		processTime: processTime,
	}
}

func (e *Engine) OnEvent(fn func(Event)) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.eventListeners = append(e.eventListeners, fn)
}

func (e *Engine) emit(event Event) {
	for _, fn := range e.eventListeners {
		fn(event)
	}
}

func (e *Engine) AddOrder(orderType core.OrderType) *core.Order {
	e.mu.Lock()
	o := e.queue.Add(orderType)
	e.emitStateSync()
	// Notify idle bots
	for _, bh := range e.bots {
		if bh.bot.Status == core.Idle {
			select {
			case bh.notify <- struct{}{}:
			default:
			}
		}
	}
	e.mu.Unlock()
	return o
}

func (e *Engine) AddBot() *core.Bot {
	e.mu.Lock()
	b := core.NewBot(e.nextBotID)
	e.nextBotID++
	bh := &botHandle{
		bot:    b,
		notify: make(chan struct{}, 1),
		stop:   make(chan struct{}),
	}
	e.bots = append(e.bots, bh)
	e.emitStateSync()
	e.mu.Unlock()

	go e.runBot(bh)

	// Kick the bot to check for orders
	select {
	case bh.notify <- struct{}{}:
	default:
	}

	return b
}

func (e *Engine) runBot(bh *botHandle) {
	for {
		select {
		case <-bh.stop:
			return
		case <-bh.notify:
			e.tryPickup(bh)
		}
	}
}

func (e *Engine) tryPickup(bh *botHandle) {
	e.mu.Lock()
	o := e.queue.Dequeue()
	if o == nil {
		e.mu.Unlock()
		return
	}
	bh.bot.Assign(o)
	e.emitStateSync()
	e.mu.Unlock()

	// Process order
	timer := time.NewTimer(e.processTime)
	select {
	case <-timer.C:
		e.mu.Lock()
		completed := bh.bot.Complete()
		e.completed = append(e.completed, completed)
		e.emitStateSync()
		e.mu.Unlock()

		// Check for more orders
		select {
		case bh.notify <- struct{}{}:
		default:
		}
	case <-bh.stop:
		timer.Stop()
		return
	}
}

func (e *Engine) RemoveBot() {
	e.mu.Lock()
	defer e.mu.Unlock()

	if len(e.bots) == 0 {
		return
	}

	// Remove newest (last) bot
	bh := e.bots[len(e.bots)-1]
	e.bots = e.bots[:len(e.bots)-1]

	// If bot was processing, return order to queue
	if bh.bot.Status == core.BotProcessing {
		o := bh.bot.Cancel()
		e.queue.Return(o)
	}

	close(bh.stop)
	e.emitStateSync()
}

func (e *Engine) state() State {
	bots := make([]*core.Bot, len(e.bots))
	for i, bh := range e.bots {
		// Deep copy to avoid races with goroutines modifying bot state
		botCopy := *bh.bot
		if bh.bot.Order != nil {
			orderCopy := *bh.bot.Order
			botCopy.Order = &orderCopy
		}
		bots[i] = &botCopy
	}

	// Include processing orders (from bots) alongside pending queue orders
	pending := e.queue.Pending()
	for _, bh := range e.bots {
		if bh.bot.Status == core.BotProcessing && bh.bot.Order != nil {
			orderCopy := *bh.bot.Order
			pending = append(pending, &orderCopy)
		}
	}

	return State{
		PendingOrders:   pending,
		CompletedOrders: append([]*core.Order{}, e.completed...),
		Bots:            bots,
	}
}

func (e *Engine) State() State {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.state()
}

func (e *Engine) emitStateSync() {
	e.emit(Event{Type: "state_sync", Payload: e.state()})
}
