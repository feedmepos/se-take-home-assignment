package order

import (
	"fmt"
	"io"
	"sync"
	"time"
)

// EventLogger 是并发安全的 io.Writer 包装，所有写操作互斥。
// 多个 bot goroutine 和 dispatchLoop 会同时写日志，必须串行化。
type EventLogger struct {
	mu sync.Mutex
	w  io.Writer
}

// NewEventLogger 创建一个写到 w 的 logger。
func NewEventLogger(w io.Writer) *EventLogger {
	return &EventLogger{w: w}
}

func (l *EventLogger) Header() {
	l.mu.Lock()
	defer l.mu.Unlock()
	fmt.Fprintln(l.w, "McDonald's Order Management System - Simulation Results")
	fmt.Fprintln(l.w)
}

func (l *EventLogger) Event(format string, args ...any) {
	l.mu.Lock()
	defer l.mu.Unlock()
	fmt.Fprintf(l.w, "[%s] %s\n", time.Now().Format("15:04:05"), fmt.Sprintf(format, args...))
}

func (l *EventLogger) BlankLine() {
	l.mu.Lock()
	defer l.mu.Unlock()
	fmt.Fprintln(l.w)
}

func (l *EventLogger) Line(format string, args ...any) {
	l.mu.Lock()
	defer l.mu.Unlock()
	fmt.Fprintf(l.w, format+"\n", args...)
}
