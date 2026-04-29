package mcd

import (
	"sync"
	"time"
)

// Clock abstracts time operations for testing
type Clock interface {
	Now() time.Time
	After(d time.Duration) <-chan time.Time
}

// RealClock uses actual system time
type RealClock struct{}

func (RealClock) Now() time.Time {
	return time.Now()
}

func (RealClock) After(d time.Duration) <-chan time.Time {
	return time.After(d)
}

// FakeClock allows manual time control for testing
type FakeClock struct {
	mu      sync.Mutex
	now     time.Time
	waiters []waiter
}

type waiter struct {
	deadline time.Time
	ch       chan time.Time
}

func NewFakeClock(start time.Time) *FakeClock {
	return &FakeClock{now: start}
}

func (f *FakeClock) Now() time.Time {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.now
}

func (f *FakeClock) After(d time.Duration) <-chan time.Time {
	f.mu.Lock()
	defer f.mu.Unlock()

	ch := make(chan time.Time, 1)
	deadline := f.now.Add(d)

	// If already past deadline, fire immediately
	if !deadline.After(f.now) {
		ch <- f.now
		return ch
	}

	f.waiters = append(f.waiters, waiter{deadline: deadline, ch: ch})
	return ch
}

// Advance moves time forward and triggers expired waiters
func (f *FakeClock) Advance(d time.Duration) {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.now = f.now.Add(d)

	// Trigger all waiters whose deadline has passed
	remaining := f.waiters[:0]
	for _, w := range f.waiters {
		if !w.deadline.After(f.now) {
			w.ch <- f.now
		} else {
			remaining = append(remaining, w)
		}
	}
	f.waiters = remaining
}
