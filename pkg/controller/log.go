package controller

import (
	"fmt"
	"time"
)

func Log(s string) {
	fmt.Println(timestamp(), s)
}

func timestamp() string {
	t := time.Now()
	return t.Format("[15:04:05]")
}
