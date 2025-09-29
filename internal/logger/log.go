package logger

import (
	"fmt"
	"time"
)

func Info(format string, args ...any) {
	fmt.Printf(format+"\n", args...)
}

func InfoWithTimeStamp(format string, args ...any) {
	fmt.Printf("[%s] %s\n", time.Now().Format(time.TimeOnly), fmt.Sprintf(format, args...))
}
