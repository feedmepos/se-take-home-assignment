package output

import (
	"fmt"
	"io"
	"sync"
	"time"
)

type Logger struct {
	mu  sync.Mutex
	w   io.Writer
	buf interface{ String() string } // non-nil only when w is a *bytes.Buffer
}

func NewLogger(w io.Writer) *Logger {
	l := &Logger{w: w}
	if b, ok := w.(interface{ String() string }); ok {
		l.buf = b
	}
	return l
}

// Snapshot returns all logged output so far; safe to call concurrently.
func (l *Logger) Snapshot() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.buf != nil {
		return l.buf.String()
	}
	return ""
}

func (l *Logger) Log(format string, args ...any) {
	ts := time.Now().Format("15:04:05")
	line := fmt.Sprintf("[%s] %s\n", ts, fmt.Sprintf(format, args...))
	l.mu.Lock()
	fmt.Fprint(l.w, line)
	l.mu.Unlock()
}
