package main

import (
	"flag"
	"fmt"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/domain"
)

func main() {
	demo := flag.Bool("demo", false, "运行固定演示场景并打印带时间戳的日志（CI / result.txt）")
	flag.Parse()

	if *demo {
		runDemo()
		return
	}

	ts := time.Now().Format("15:04:05")
	fmt.Printf("%s orderctl: use -demo for CI scenario\n", ts)
	var seq domain.OrderIDSeq
	fmt.Printf("%s next order id = %d\n", time.Now().Format("15:04:05"), seq.Next())
}
