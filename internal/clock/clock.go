package clock

import "time"

// Clock abstracts time.After so tests can control time without real sleeps.
type Clock interface {
	After(d time.Duration) <-chan time.Time
}

// Real is the production clock backed by the system clock.
type Real struct{}

func (Real) After(d time.Duration) <-chan time.Time { return time.After(d) }
