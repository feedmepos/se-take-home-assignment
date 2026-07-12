package controller

import (
	"container/list"
	"fmt"
	"io"
	"sort"
	"time"
)

// OrderType distinguishes VIP orders from normal ones.
type OrderType int

const (
	Normal OrderType = iota
	VIP
)

func (t OrderType) String() string {
	if t == VIP {
		return "VIP"
	}
	return "Normal"
}

// OrderStatus tracks where an order sits in the flow.
type OrderStatus int

const (
	StatusPending OrderStatus = iota
	StatusProcessing
	StatusComplete
)

func (s OrderStatus) String() string {
	switch s {
	case StatusProcessing:
		return "PROCESSING"
	case StatusComplete:
		return "COMPLETE"
	default:
		return "PENDING"
	}
}

// Order is a single customer order.
type Order struct {
	ID     int
	Type   OrderType
	Status OrderStatus
}

// completion is sent by a bot to the Manager when an order finishes cooking.
type completion struct {
	botID int
	order *Order
}

// returnedOrder is sent by a bot to the Manager when it is cancelled while
// still cooking, handing the unfinished order back to be re-queued.
type returnedOrder struct {
	botID int
	order *Order
}

// bot is a self-contained cooking worker. It shares no memory with the Manager;
// they communicate purely over channels:
//   - orders (Manager -> bot): the next order to cook.
//   - cancel (Manager -> bot): stop now.
//   - done   (bot -> Manager): an order finished cooking.
//   - ret    (bot -> Manager): an in-flight order handed back on cancel.
type bot struct {
	id     int
	orders chan *Order
	cancel chan struct{}

	// elem is the bot's node in Manager.idle while it is idle, or nil.
	elem *list.Element
}

// run is the bot's loop: wait for an order, cook it for dur, then report the
// result. A cancel while idle exits immediately; a cancel while cooking hands
// the order back via ret and exits.
func (b *bot) run(dur time.Duration, done chan<- completion, ret chan<- returnedOrder) {
	for {
		select {
		case <-b.cancel:
			return
		case order := <-b.orders:
			select {
			case <-time.After(dur):
				done <- completion{botID: b.id, order: order}
			case <-b.cancel:
				ret <- returnedOrder{botID: b.id, order: order}
				return
			}
		}
	}
}

// Manager owns all order/bot state. A single event-loop goroutine mutates that
// state in response to commands and bot messages, so no locks are required.
type Manager struct {
	procDur time.Duration
	out     io.Writer

	commands chan func()
	done     chan completion
	returned chan returnedOrder

	// The fields below are owned exclusively by the loop goroutine.
	pending   []*Order
	completed []*Order
	bots      []*bot
	idle      *list.List // FIFO of idle *bot; O(1) push/pop/remove, no growth

	orderSeq int
	botSeq   int
}

// NewManager builds a Manager and starts its event loop. procDur is the
// per-order processing time (10s in production, small values in tests).
func NewManager(procDur time.Duration, out io.Writer) *Manager {
	m := &Manager{
		procDur:  procDur,
		out:      out,
		commands: make(chan func()),
		done:     make(chan completion),
		returned: make(chan returnedOrder),
		idle:     list.New(),
		orderSeq: 1000,
	}
	go m.loop()
	return m
}

// loop is the single goroutine that owns all mutable state.
func (m *Manager) loop() {
	for {
		select {
		case cmd := <-m.commands:
			cmd()
		case c := <-m.done:
			m.onComplete(c)
		case r := <-m.returned:
			m.onReturn(r)
		}
	}
}

func (m *Manager) logf(format string, args ...interface{}) {
	fmt.Fprintf(m.out, "[%s] %s\n", time.Now().Format("15:04:05"), fmt.Sprintf(format, args...))
}

// less reports whether a should be processed before b:
// VIP outrank Normal, and within a class the lower (earlier) ID wins.
func less(a, b *Order) bool {
	if a.Type != b.Type {
		return a.Type == VIP
	}
	return a.ID < b.ID
}

// insertPending places o into the pending queue keeping priority order.
// Because it sorts by ID within a class, a re-queued order returns to its
// original position relative to its peers.
func (m *Manager) insertPending(o *Order) {
	o.Status = StatusPending
	idx := sort.Search(len(m.pending), func(i int) bool {
		return less(o, m.pending[i])
	})
	m.pending = append(m.pending, nil)
	copy(m.pending[idx+1:], m.pending[idx:])
	m.pending[idx] = o
}

// dispatch hands pending orders to idle bots while both are available.
// Runs only inside the loop goroutine; the send always succeeds because an
// idle bot is, by definition, waiting to receive on its orders channel.
func (m *Manager) dispatch() {
	for len(m.pending) > 0 && m.idle.Len() > 0 {
		front := m.idle.Front()
		b := front.Value.(*bot)
		m.idle.Remove(front)
		b.elem = nil

		o := m.pending[0]
		m.pending = m.pending[1:]
		o.Status = StatusProcessing
		b.orders <- o
		m.logf("Bot #%d picked up %s Order #%d - Status: PROCESSING", b.id, o.Type, o.ID)
	}
}

func (m *Manager) onComplete(c completion) {
	c.order.Status = StatusComplete
	m.completed = append(m.completed, c.order)
	m.logf("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %s)",
		c.botID, c.order.Type, c.order.ID, m.procDur)

	b := m.activeBot(c.botID)
	if b == nil {
		return // bot was removed while finishing up
	}
	m.markIdle(b)
}

func (m *Manager) onReturn(r returnedOrder) {
	m.insertPending(r.order)
	m.logf("Bot #%d stopped - returned %s Order #%d to PENDING", r.botID, r.order.Type, r.order.ID)
	m.dispatch()
}

// markIdle registers b as idle, dispatches any pending work, and logs an IDLE
// message if nothing was available for it.
func (m *Manager) markIdle(b *bot) {
	b.elem = m.idle.PushBack(b)
	m.dispatch()
	if b.elem != nil {
		m.logf("Bot #%d is now IDLE - No pending orders", b.id)
	}
}

func (m *Manager) removeIdle(b *bot) bool {
	if b.elem == nil {
		return false
	}
	m.idle.Remove(b.elem)
	b.elem = nil
	return true
}

func (m *Manager) activeBot(id int) *bot {
	for _, x := range m.bots {
		if x.id == id {
			return x
		}
	}
	return nil
}

func (m *Manager) addOrder(t OrderType) *Order {
	reply := make(chan *Order, 1)
	m.commands <- func() {
		m.orderSeq++
		o := &Order{ID: m.orderSeq, Type: t}
		m.insertPending(o)
		m.logf("Created %s Order #%d - Status: PENDING", t, o.ID)
		m.dispatch()
		reply <- o
	}
	return <-reply
}

// AddNormalOrder queues a normal customer order.
func (m *Manager) AddNormalOrder() *Order { return m.addOrder(Normal) }

// AddVIPOrder queues a VIP order ahead of all normal orders.
func (m *Manager) AddVIPOrder() *Order { return m.addOrder(VIP) }

// AddBot creates a bot that immediately starts working on pending orders.
func (m *Manager) AddBot() int {
	reply := make(chan int, 1)
	m.commands <- func() {
		m.botSeq++
		b := &bot{id: m.botSeq, orders: make(chan *Order), cancel: make(chan struct{})}
		m.bots = append(m.bots, b)
		m.logf("Bot #%d created - Status: ACTIVE", b.id)
		go b.run(m.procDur, m.done, m.returned)
		m.markIdle(b)
		reply <- b.id
	}
	return <-reply
}

// RemoveBot destroys the newest bot. If it is processing an order, the bot
// hands the order back over its return channel and the loop re-queues it at the
// correct priority position; an idle bot simply stops. Returns false if there
// are no bots.
func (m *Manager) RemoveBot() bool {
	reply := make(chan bool, 1)
	m.commands <- func() {
		if len(m.bots) == 0 {
			m.logf("No bots to remove")
			reply <- false
			return
		}
		b := m.bots[len(m.bots)-1]
		m.bots = m.bots[:len(m.bots)-1]
		m.removeIdle(b)
		close(b.cancel)
		m.logf("Bot #%d destroyed", b.id)
		reply <- true
	}
	return <-reply
}

// Snapshot is an immutable view of the system state for status reporting/tests.
type Snapshot struct {
	Pending   []Order
	Completed []Order
	BotCount  int
}

// Status returns a consistent snapshot of the current state.
func (m *Manager) Status() Snapshot {
	reply := make(chan Snapshot, 1)
	m.commands <- func() {
		s := Snapshot{BotCount: len(m.bots)}
		for _, o := range m.pending {
			s.Pending = append(s.Pending, *o)
		}
		for _, o := range m.completed {
			s.Completed = append(s.Completed, *o)
		}
		reply <- s
	}
	return <-reply
}

// Stop tears down all remaining bots.
func (m *Manager) Stop() {
	done := make(chan struct{})
	m.commands <- func() {
		for len(m.bots) > 0 {
			b := m.bots[len(m.bots)-1]
			m.bots = m.bots[:len(m.bots)-1]
			m.removeIdle(b)
			close(b.cancel)
			m.logf("Bot #%d destroyed", b.id)
		}
		close(done)
	}
	<-done
}
