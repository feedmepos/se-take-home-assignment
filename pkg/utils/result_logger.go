package utils

import (
	"fmt"
	"os"
	"sync"
	"time"
)

type ResultLogger struct {
	mu      sync.Mutex
	logFile string
}

var (
	resultInstance *ResultLogger
	resultOnce     sync.Once
)

func GetResultLogger() *ResultLogger {
	resultOnce.Do(func() {
		resultInstance = &ResultLogger{
			logFile: "scripts/result.txt",
		}
		_ = os.MkdirAll("scripts", 0755)
		_ = os.WriteFile(resultInstance.logFile, []byte("McDonald's Order Management System - Simulation Results\n\n"), 0644)
	})
	return resultInstance
}

func (l *ResultLogger) Log(format string, a ...interface{}) {
	l.mu.Lock()
	defer l.mu.Unlock()

	timestamp := time.Now().Format("15:04:05")
	msg := fmt.Sprintf(format, a...)
	entry := fmt.Sprintf("[%s] %s\n", timestamp, msg)

	f, err := os.OpenFile(l.logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err == nil {
		defer f.Close()
		_, _ = f.WriteString(entry)
	}
}

func (l *ResultLogger) WriteHeader(header string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	_ = os.WriteFile(l.logFile, []byte(header+"\n\n"), 0644)
}

func (l *ResultLogger) WriteRaw(content string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	f, err := os.OpenFile(l.logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err == nil {
		defer f.Close()
		_, _ = f.WriteString(content)
	}
}
