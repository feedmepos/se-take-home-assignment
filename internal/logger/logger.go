package logger

import (
	"fmt"
	"strings"
	"sync"
	"time"
)

type Logger struct {
	mu     sync.Mutex
	output strings.Builder
}

func New() *Logger {
	return &Logger{}
}

func (l *Logger) Log(format string, args ...interface{}) {
	l.mu.Lock()
	defer l.mu.Unlock()

	timestamp := time.Now().Format("15:04:05")
	message := fmt.Sprintf(format, args...)
	l.output.WriteString(fmt.Sprintf("[%s] %s\n", timestamp, message))
}

func (l *Logger) GetOutput() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.output.String()
}

