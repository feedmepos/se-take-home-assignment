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
	VVIP OrderType = "VVIP"
)

type BotType string

const (
	NormalBot BotType = "NORMAL"
	FastBot   BotType = "FAST"
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
	ID           int
	Type         BotType
	ProcessDelay time.Duration
	cancelCh     chan struct{}
	doneCh       chan struct{}
	current      *Order
	pickupTime time.Time
}

type BotStatus struct {
	BotID        int
	Type         BotType
	State        string
	CurrentOrder int
	RemainingTime int64
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
	mu          sync.Mutex
	clock       Clock
	out         io.Writer
	normalDelay time.Duration
	fastDelay   time.Duration

	nextOrderID int
	nextBotID   int

	vvipQueue []*Order
	vipQueue    []*Order
	normalQueue []*Order
	completed   []*Order
	bots        []*Bot
}

func NewEngine(clock Clock, out io.Writer, normalDelay, fastDelay time.Duration) *Engine {
	return &Engine{
		clock:       clock,
		out:         out,
		normalDelay: normalDelay,
		fastDelay:   fastDelay,
		nextOrderID: 1001,
		nextBotID:   1,
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
	if t == VVIP {
		e.vvipQueue = append(e.vvipQueue, order)
	} else if t == VIP {
		e.vipQueue = append(e.vipQueue, order)
	} else {
		e.normalQueue = append(e.normalQueue, order)
	}
	e.logf("Created %s Order #%d - Status: %s", t, order.ID, order.Status)
	e.mu.Unlock()
	return order
}

func (e *Engine) AddBot(t BotType) int {
	e.mu.Lock()
	bot := &Bot{
		ID:           e.nextBotID,
		Type:         t,
		ProcessDelay: e.delayForBotType(t),
		cancelCh:     make(chan struct{}),
		doneCh:       make(chan struct{}),
	}
	e.nextBotID++
	e.bots = append(e.bots, bot)
	e.logf("%s Bot #%d created - Status: ACTIVE", bot.Type, bot.ID)
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
		bot.pickupTime = time.Now()
		e.logf("%s Bot #%d picked up %s Order #%d - Status: %s", bot.Type, bot.ID, order.Type, order.ID, order.Status)
		e.mu.Unlock()

		if e.waitOrCancelled(bot.cancelCh, bot.ProcessDelay) {
			e.mu.Lock()
			order.Status = Pending
			bot.current = nil
			e.requeueFront(order)
			e.logf("%s Bot #%d destroyed while processing Order #%d - returned to PENDING", bot.Type, bot.ID, order.ID)
			e.mu.Unlock()
			return
		}

		e.mu.Lock()
		order.Status = Complete
		bot.current = nil
		e.completed = append(e.completed, order)
		e.logf("%s Bot #%d completed %s Order #%d - Status: %s (Processing time: %ds)", bot.Type, bot.ID, order.Type, order.ID, order.Status, int(bot.ProcessDelay.Seconds()))
		e.mu.Unlock()
	}
}

func (e *Engine) delayForBotType(t BotType) time.Duration {
	switch t {
	case FastBot:
		return e.fastDelay
	default:
		return e.normalDelay
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
	
	if len(e.vvipQueue) > 0 {
		o := e.vvipQueue[0]
		e.vvipQueue = e.vvipQueue[1:]
		return o
	}

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
	if o.Type == VVIP {
		e.vvipQueue = append([]*Order{o}, e.vvipQueue...)
	}else if o.Type == VIP {
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
	e.logf("%s Bot #%d destroyed", bot.Type, bot.ID)
	return true
}

func (e *Engine) PendingCount() int {
	e.mu.Lock()
	defer e.mu.Unlock()
	return len(e.vvipQueue) + len(e.vipQueue) + len(e.normalQueue)
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

	now := time.Now().Unix();
	for _, b := range e.bots {
		state := "IDLE"
		currentOrder := 0
		var rt int64
		if b.current != nil {
			state = "PROCESSING"
			currentOrder = b.current.ID
			s.ActiveTasks = append(s.ActiveTasks, TaskStatus{
				OrderID: b.current.ID,
				Type:    b.current.Type,
				Status:  b.current.Status,
				BotID:   b.ID,
			})

		rt = int64(b.ProcessDelay.Seconds()) - (now - b.pickupTime.Unix())
		}
		s.Bots = append(s.Bots, BotStatus{
			BotID:        b.ID,
			Type:         b.Type,
			State:        state,
			CurrentOrder: currentOrder,
			RemainingTime: rt,
		})
	}

	for _, o := range e.vvipQueue {
		s.ActiveTasks = append(s.ActiveTasks, TaskStatus{
			OrderID: o.ID,
			Type:    o.Type,
			Status:  o.Status,
			BotID:   0,
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
