package mcd

import (
	"io"
	"sync"
)

// SafeWriter wraps an io.Writer with mutex protection for concurrent writes
type SafeWriter struct {
	mu sync.Mutex
	w  io.Writer
}

// NewSafeWriter creates a new thread-safe writer
func NewSafeWriter(w io.Writer) *SafeWriter {
	return &SafeWriter{w: w}
}

func (sw *SafeWriter) Write(p []byte) (n int, err error) {
	sw.mu.Lock()
	defer sw.mu.Unlock()
	return sw.w.Write(p)
}

// String returns the string content if the underlying writer is a bytes.Buffer
// This method is thread-safe
func (sw *SafeWriter) String() string {
	sw.mu.Lock()
	defer sw.mu.Unlock()
	if buf, ok := sw.w.(interface{ String() string }); ok {
		return buf.String()
	}
	return ""
}
