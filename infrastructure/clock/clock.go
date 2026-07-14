// Package clock provides a concrete, real-time implementation of a Clock
// abstraction. It intentionally has no dependency on any other package in
// this module — callers depend on it only through a small structural
// interface (typically `interface { Now() time.Time }`) declared wherever
// it's consumed, so this package can be swapped out for a fake in tests
// without an import cycle.
package clock

import "time"

// System is a Clock implementation backed by the real wall clock.
// Its zero value is ready to use.
type System struct{}

// Now returns the current local time, as reported by time.Now().
func (System) Now() time.Time {
	return time.Now()
}
