package clock

import "time"

type Clock interface {
	Now() time.Time
	Advance(time.Duration)
}
