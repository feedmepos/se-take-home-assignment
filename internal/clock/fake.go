package clock

import (
	"sync"
	"time"
)

type waiter struct {
	deadline time.Time
	ch       chan time.Time
}

// Fake is a manually-advanced clock for deterministic tests.
type Fake struct {
	mu      sync.Mutex
	now     time.Time
	waiters []*waiter
}

func NewFake() *Fake {
	return &Fake{now: time.Unix(0, 0)}
}

// After registers a timer that fires when Advance moves past the deadline.
func (f *Fake) After(d time.Duration) <-chan time.Time {
	f.mu.Lock()
	defer f.mu.Unlock()
	ch := make(chan time.Time, 1)
	f.waiters = append(f.waiters, &waiter{deadline: f.now.Add(d), ch: ch})
	return ch
}

// Advance moves the clock forward by d and fires any timers that are now due.
func (f *Fake) Advance(d time.Duration) {
	f.mu.Lock()
	f.now = f.now.Add(d)
	now := f.now
	var due, pending []*waiter
	for _, w := range f.waiters {
		if !w.deadline.After(now) {
			due = append(due, w)
		} else {
			pending = append(pending, w)
		}
	}
	f.waiters = pending
	f.mu.Unlock()

	for _, w := range due {
		w.ch <- now
	}
}
