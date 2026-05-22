package engine

import (
	"fmt"
	"time"
)

func HHMMSSNow() string {
	return time.Now().Format("15:04:05")
}

func PrintLine(s string) {
	fmt.Println(s)
}

func PrintTimed(s string) {
	fmt.Printf("[%s] %s\n", HHMMSSNow(), s)
}
