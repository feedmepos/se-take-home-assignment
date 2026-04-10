package sim

import (
	"fmt"
	"io"
	"sync"
	"time"
)

type OrderType string

const (
	Normal OrderType = "NORMAL"
	VIP    OrderType = "VIP"
)

type OrderStatus string

const (
	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Complete   OrderStatus = "COMPLETE"
)

type Order struct {
	ID     int
	Type   OrderType
	Status OrderStatus
}

type Clock interface {
	Now() time.Time
	Sleep(time.Duration)
}

type RealClock struct{}

func (RealClock) Now() time.Time { return time.Now() }
func (RealClock) Sleep(d time.Duration) {
	time.Sleep(d)
}

type Bot struct {
	ID       int
	cancelCh chan struct{}
	doneCh   chan struct{}
	current  *Order
}

type BotStatus struct {
	BotID        int
	State        string
	CurrentOrder int
}

type TaskStatus struct {
	OrderID int
	Type    OrderType
	Status  OrderStatus
	BotID   int
}

type Snapshot struct {
	Bots           []BotStatus
	ActiveTasks    []TaskStatus
	CompletedTasks []TaskStatus
}

type Engine struct {
	mu           sync.Mutex
	clock        Clock
	out          io.Writer
	processDelay time.Duration

	nextOrderID int
	nextBotID   int

	vipQueue    []*Order
	normalQueue []*Order
	completed   []*Order
	bots        []*Bot
}

func NewEngine(clock Clock, out io.Writer, processDelay time.Duration) *Engine {
	return &Engine{
		clock:        clock,
		out:          out,
		processDelay: processDelay,
		nextOrderID:  1001,
		nextBotID:    1,
	}
}

func (e *Engine) logf(format string, args ...any) {
	ts := e.clock.Now().Format("15:04:05")
	fmt.Fprintf(e.out, "[%s] %s\n", ts, fmt.Sprintf(format, args...))
}

func (e *Engine) NewOrder(t OrderType) *Order {
	e.mu.Lock()
	order := &Order{
		ID:     e.nextOrderID,
		Type:   t,
		Status: Pending,
	}
	e.nextOrderID++
	if t == VIP {
		e.vipQueue = append(e.vipQueue, order)
	} else {
		e.normalQueue = append(e.normalQueue, order)
	}
	e.logf("Created %s Order #%d - Status: %s", t, order.ID, order.Status)
	e.mu.Unlock()
	return order
}

func (e *Engine) AddBot() int {
	e.mu.Lock()
	bot := &Bot{
		ID:       e.nextBotID,
		cancelCh: make(chan struct{}),
		doneCh:   make(chan struct{}),
	}
	e.nextBotID++
	e.bots = append(e.bots, bot)
	e.logf("Bot #%d created - Status: ACTIVE", bot.ID)
	e.mu.Unlock()

	go e.runBot(bot)
	return bot.ID
}

func (e *Engine) runBot(bot *Bot) {
	defer close(bot.doneCh)
	for {
		select {
		case <-bot.cancelCh:
			return
		default:
		}

		order := e.dequeue()
		if order == nil {
			e.clock.Sleep(20 * time.Millisecond)
			continue
		}

		e.mu.Lock()
		order.Status = Processing
		bot.current = order
		e.logf("Bot #%d picked up %s Order #%d - Status: %s", bot.ID, order.Type, order.ID, order.Status)
		e.mu.Unlock()

		if e.waitOrCancelled(bot.cancelCh, e.processDelay) {
			e.mu.Lock()
			order.Status = Pending
			bot.current = nil
			e.requeueFront(order)
			e.logf("Bot #%d destroyed while processing Order #%d - returned to PENDING", bot.ID, order.ID)
			e.mu.Unlock()
			return
		}

		e.mu.Lock()
		order.Status = Complete
		bot.current = nil
		e.completed = append(e.completed, order)
		e.logf("Bot #%d completed %s Order #%d - Status: %s (Processing time: %ds)", bot.ID, order.Type, order.ID, order.Status, int(e.processDelay.Seconds()))
		e.mu.Unlock()
	}
}

func (e *Engine) waitOrCancelled(cancel <-chan struct{}, d time.Duration) bool {
	step := 20 * time.Millisecond
	remaining := d
	for remaining > 0 {
		select {
		case <-cancel:
			return true
		default:
		}
		cur := step
		if remaining < step {
			cur = remaining
		}
		e.clock.Sleep(cur)
		remaining -= cur
	}
	select {
	case <-cancel:
		return true
	default:
		return false
	}
}

func (e *Engine) dequeue() *Order {
	e.mu.Lock()
	defer e.mu.Unlock()
	if len(e.vipQueue) > 0 {
		o := e.vipQueue[0]
		e.vipQueue = e.vipQueue[1:]
		return o
	}
	if len(e.normalQueue) > 0 {
		o := e.normalQueue[0]
		e.normalQueue = e.normalQueue[1:]
		return o
	}
	return nil
}

func (e *Engine) requeueFront(o *Order) {
	if o.Type == VIP {
		e.vipQueue = append([]*Order{o}, e.vipQueue...)
		return
	}
	e.normalQueue = append([]*Order{o}, e.normalQueue...)
}

func (e *Engine) RemoveNewestBot() bool {
	e.mu.Lock()
	if len(e.bots) == 0 {
		e.mu.Unlock()
		return false
	}
	idx := len(e.bots) - 1
	bot := e.bots[idx]
	e.bots = e.bots[:idx]
	e.mu.Unlock()

	close(bot.cancelCh)
	<-bot.doneCh
	e.logf("Bot #%d destroyed", bot.ID)
	return true
}

func (e *Engine) PendingCount() int {
	e.mu.Lock()
	defer e.mu.Unlock()
	return len(e.vipQueue) + len(e.normalQueue)
}

func (e *Engine) CompletedCount() int {
	e.mu.Lock()
	defer e.mu.Unlock()
	return len(e.completed)
}

func (e *Engine) ActiveBotCount() int {
	e.mu.Lock()
	defer e.mu.Unlock()
	return len(e.bots)
}

func (e *Engine) Snapshot() Snapshot {
	e.mu.Lock()
	defer e.mu.Unlock()

	s := Snapshot{
		Bots:           make([]BotStatus, 0, len(e.bots)),
		ActiveTasks:    make([]TaskStatus, 0, len(e.vipQueue)+len(e.normalQueue)+len(e.bots)),
		CompletedTasks: make([]TaskStatus, 0, len(e.completed)),
	}

	for _, b := range e.bots {
		state := "IDLE"
		currentOrder := 0
		if b.current != nil {
			state = "PROCESSING"
			currentOrder = b.current.ID
			s.ActiveTasks = append(s.ActiveTasks, TaskStatus{
				OrderID: b.current.ID,
				Type:    b.current.Type,
				Status:  b.current.Status,
				BotID:   b.ID,
			})
		}
		s.Bots = append(s.Bots, BotStatus{
			BotID:        b.ID,
			State:        state,
			CurrentOrder: currentOrder,
		})
	}

	for _, o := range e.vipQueue {
		s.ActiveTasks = append(s.ActiveTasks, TaskStatus{
			OrderID: o.ID,
			Type:    o.Type,
			Status:  o.Status,
			BotID:   0,
		})
	}
	for _, o := range e.normalQueue {
		s.ActiveTasks = append(s.ActiveTasks, TaskStatus{
			OrderID: o.ID,
			Type:    o.Type,
			Status:  o.Status,
			BotID:   0,
		})
	}
	for _, o := range e.completed {
		s.CompletedTasks = append(s.CompletedTasks, TaskStatus{
			OrderID: o.ID,
			Type:    o.Type,
			Status:  o.Status,
			BotID:   0,
		})
	}

	return s
}
