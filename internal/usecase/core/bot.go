package core

import "sync"

// BotStatus represents whether a bot is currently working on an order.
type BotStatus int

const (
	// Idle means the bot has no order assigned and is waiting for work.
	Idle BotStatus = iota
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
// a time. Its lifecycle is controlled via StopCh/Done: closing StopCh signals
// the bot's worker goroutine to stop, and the goroutine closes Done once it
// has fully wound down (releasing any in-flight order back to the queue).
type Bot struct {
	ID int

	// StopCh is closed to signal the bot's worker goroutine to stop.
	StopCh chan struct{}
	// Done is closed by the worker goroutine once it has finished
	// shutting down, so callers can wait for a clean stop.
	Done chan struct{}

	stopOnce sync.Once

	mu      sync.Mutex
	current *Order // nil when idle
}

// NewBot creates a new bot with the given ID in the Idle state, allocating
// the channels used to coordinate shutdown.
func NewBot(id int) *Bot {
	return &Bot{
		ID:     id,
		StopCh: make(chan struct{}),
		Done:   make(chan struct{}),
	}
}

// Stop signals the bot to stop processing. It is safe to call multiple
// times; only the first call closes StopCh.
func (b *Bot) Stop() {
	b.stopOnce.Do(func() {
		close(b.StopCh)
	})
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

// Status reports whether the bot is Idle or BotProcessing.
func (b *Bot) Status() BotStatus {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.current == nil {
		return Idle
	}
	return BotProcessing
}
