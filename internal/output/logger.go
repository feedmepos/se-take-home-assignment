package output

import (
	"fmt"
	"io"
	"sync"
	"time"
)

type Logger struct {
	mu sync.Mutex
	w  io.Writer
}

func NewLogger(w io.Writer) *Logger {
	return &Logger{w: w}
}

func (l *Logger) Log(format string, args ...any) {
	ts := time.Now().Format("15:04:05")
	l.mu.Lock()
	_, _ = fmt.Fprintf(l.w, "[%s] "+format+"\n", append([]any{ts}, args...)...)
	l.mu.Unlock()
}
