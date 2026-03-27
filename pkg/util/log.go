package util

import (
	"fmt"
	"time"
)

func Log(format string, args ...interface{}) {
	timestamp := time.Now().Format("15:04:05")
	msg := fmt.Sprintf(format, args...)
	fmt.Printf("[%s] %s\n", timestamp, msg)
}
