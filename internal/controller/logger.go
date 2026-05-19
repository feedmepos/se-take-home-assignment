package controller

import (
	"fmt"
	"io"
	"sync"
	"time"
)

// Logger writes timestamped lines to one or more sinks. Format is fixed at
// "[HH:MM:SS] <message>" so it satisfies the HH:MM:SS requirement.
type Logger struct {
	mu      sync.Mutex
	now     func() time.Time
	writers []io.Writer
}

func NewLogger(now func() time.Time, writers ...io.Writer) *Logger {
	if now == nil {
		now = time.Now
	}
	return &Logger{now: now, writers: writers}
}

func (l *Logger) Logf(format string, args ...any) {
	if l == nil {
		return
	}
	ts := l.now().Format("15:04:05")
	line := fmt.Sprintf("[%s] %s\n", ts, fmt.Sprintf(format, args...))
	l.mu.Lock()
	defer l.mu.Unlock()
	for _, w := range l.writers {
		_, _ = io.WriteString(w, line)
	}
}
