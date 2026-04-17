package clock

import "time"

type FakeClock struct {
	now time.Time
}

func NewFake(start time.Time) *FakeClock {
	return &FakeClock{now: start}
}

func (c *FakeClock) Now() time.Time {
	return c.now
}

func (c *FakeClock) Advance(duration time.Duration) {
	c.now = c.now.Add(duration)
}
