package core

import "sync"

// BotStatus represents whether a bot is currently working on an order.
type BotStatus int

// A bot's status is always derived from whether it currently holds an order
// (see Bot.Status), never from an uninitialized value, so BotIdle is a safe
// zero value and no Unknown sentinel is needed.
const (
	// BotIdle means the bot has no order assigned and is waiting for work.
	BotIdle BotStatus = iota
	// BotProcessing means the bot is actively cooking an order.
	BotProcessing
)

// String returns the human-readable name of the bot status.
func (s BotStatus) String() string {
	switch s {
	case BotProcessing:
		return "PROCESSING"
	default:
		return "IDLE"
	}
}

// Bot represents a single cooking bot. A bot processes exactly one order at
// a time. Its lifecycle is coordinated by two internal channels: Stop closes
// the stop channel to signal the worker goroutine to stop, and the worker
// calls MarkDone once it has fully wound down (releasing any in-flight order
// back to the queue). Both channels are unexported so every close goes
// through its sync.Once guard — a double close is impossible by construction.
type Bot struct {
	ID int

	stopCh   chan struct{}
	stopOnce sync.Once
	done     chan struct{}
	doneOnce sync.Once

	mu      sync.Mutex
	current *Order // nil when idle
}

// NewBot creates a new bot with the given ID in the BotIdle state, allocating
// the channels used to coordinate shutdown.
func NewBot(id int) *Bot {
	return &Bot{
		ID:     id,
		stopCh: make(chan struct{}),
		done:   make(chan struct{}),
	}
}

// Stop signals the bot to stop processing. It is safe to call multiple
// times; only the first call closes the stop channel.
func (b *Bot) Stop() {
	b.stopOnce.Do(func() {
		close(b.stopCh)
	})
}

// StopSignal returns the channel that is closed when Stop is called. The
// worker goroutine (and the blocking Dequeue it calls) selects on it to
// notice a pending stop.
func (b *Bot) StopSignal() <-chan struct{} {
	return b.stopCh
}

// MarkDone records that the worker goroutine has fully wound down. It is
// called exactly once per worker via defer, but is idempotent regardless.
func (b *Bot) MarkDone() {
	b.doneOnce.Do(func() {
		close(b.done)
	})
}

// Done returns the channel that is closed once the worker goroutine has
// finished shutting down, so callers can wait for a clean stop.
func (b *Bot) Done() <-chan struct{} {
	return b.done
}

// SetProcessing marks the bot as actively working on order o.
func (b *Bot) SetProcessing(o Order) {
	b.mu.Lock()
	defer b.mu.Unlock()
	oc := o
	b.current = &oc
}

// SetIdle clears the bot's current order, marking it as Idle.
func (b *Bot) SetIdle() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.current = nil
}

// Current returns a copy of the order the bot is currently processing, or
// nil if the bot is idle.
func (b *Bot) Current() *Order {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.current == nil {
		return nil
	}
	oc := *b.current
	return &oc
}

// Status reports whether the bot is BotIdle or BotProcessing.
func (b *Bot) Status() BotStatus {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.current == nil {
		return BotIdle
	}
	return BotProcessing
}
