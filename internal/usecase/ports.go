package usecase

import "time"

// Clock is a small port that abstracts time so the processing loop is
// testable. It is intentionally minimal (Now + After) — the assignment warns
// against over-engineering, so there is no full fake-clock scheduler. Tests use
// the real clock with a very short injected processing duration instead.
type Clock interface {
	Now() time.Time
	After(d time.Duration) <-chan time.Time
}

// realClock is the production Clock backed by the stdlib.
type realClock struct{}

// NewRealClock returns a Clock backed by the real wall clock.
func NewRealClock() Clock { return realClock{} }

func (realClock) Now() time.Time                         { return time.Now() }
func (realClock) After(d time.Duration) <-chan time.Time { return time.After(d) }
