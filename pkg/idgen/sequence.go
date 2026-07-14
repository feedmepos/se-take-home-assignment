// Package idgen provides strictly-increasing ID generation.
package idgen

import "sync/atomic"

// Sequence generates strictly increasing int IDs and is safe for
// concurrent use by multiple goroutines.
type Sequence struct {
	counter atomic.Int64
}

// NewSequence creates a Sequence whose first Next() call returns start.
func NewSequence(start int64) *Sequence {
	s := &Sequence{}
	// Store start-1 so the first Add(1) in Next() yields start.
	s.counter.Store(start - 1)
	return s
}

// Next atomically returns the next value in the sequence. The int64→int
// conversion assumes a 64-bit platform (as in CI and all supported targets);
// on a 32-bit build it would wrap after ~2.1 billion IDs.
func (s *Sequence) Next() int {
	return int(s.counter.Add(1))
}
