// Package logger provides a minimal, timestamped line logger used to
// produce the event log required by the order controller (order creation,
// bot pickup/completion, status summaries, etc.).
package logger

import (
	"fmt"
	"io"
	"sync"
	"time"
)

// Clock is the small, consumer-side interface Logger needs in order to
// timestamp each line. It is declared locally (rather than imported from
// elsewhere) so this package has no dependency on any other package in the
// module; any type with a Now() time.Time method — including
// infrastructure/clock.System or a test fake — satisfies it structurally.
type Clock interface {
	Now() time.Time
}

// Logger writes timestamped log lines to an underlying io.Writer.
// It is safe for concurrent use by multiple goroutines: each call to Logf
// is serialized so lines are never interleaved.
type Logger struct {
	mu    sync.Mutex
	w     io.Writer
	clock Clock
}

// New creates a Logger that writes to w, using clock to timestamp each line.
func New(w io.Writer, clock Clock) *Logger {
	return &Logger{
		w:     w,
		clock: clock,
	}
}

// Logf formats a message per format/args (fmt.Sprintf semantics) and writes
// it as a single line: "[HH:MM:SS] <message>\n". The write is mutex-protected
// so concurrent Logf calls never interleave within a single line.
func (l *Logger) Logf(format string, args ...any) {
	msg := fmt.Sprintf(format, args...)
	line := fmt.Sprintf("[%s] %s\n", l.clock.Now().Format("15:04:05"), msg)

	l.mu.Lock()
	defer l.mu.Unlock()
	// Best-effort write: this logger has no error-reporting channel of its
	// own (Logf mirrors the fire-and-forget shape of log.Printf), so a
	// failing writer is silently ignored here rather than panicking.
	_, _ = io.WriteString(l.w, line)
}
