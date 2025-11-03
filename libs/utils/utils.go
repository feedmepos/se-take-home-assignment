package utils

import (
	"fmt"
	"time"
)

func WriteToLog(msg string) {
	fmt.Printf("[%s] %s\n", time.Now().Format("15:04:05"), msg)
}
