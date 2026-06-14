package controller

import "time"

type Timer interface {
	After(time.Duration) <-chan time.Time
}

type RealTimer struct{}

func (RealTimer) After(d time.Duration) <-chan time.Time {
	return time.After(d)
}
