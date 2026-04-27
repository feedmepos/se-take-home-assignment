package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/feedmepos/order-controller/internal/controller"
	"github.com/feedmepos/order-controller/internal/output"
)

func main() {
	procTime := 10 * time.Second
	if v := os.Getenv("PROC_TIME_MS"); v != "" {
		if d, err := time.ParseDuration(v + "ms"); err == nil {
			procTime = d
		}
	}

	logger := output.NewLogger(os.Stdout)
	ctrl := controller.New(logger, procTime)

	logger.Log("McDonald's Order Controller started (processing time: %s)", procTime)
	logger.Log("Commands: order normal | order vip | bot add | bot remove | sleep <duration> | status | exit")

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Fprint(os.Stderr, "> ")
		if !scanner.Scan() {
			break
		}
		cmd := strings.TrimSpace(scanner.Text())
		if cmd == "exit" || cmd == "quit" {
			break
		}
		if err := handle(ctrl, cmd); err != nil {
			logger.Log("Unknown command: %q", cmd)
		}
	}

	ctrl.WaitAll()
}

func handle(ctrl *controller.Controller, cmd string) error {
	switch {
	case cmd == "order normal":
		ctrl.AddOrder(false)
	case cmd == "order vip":
		ctrl.AddOrder(true)
	case cmd == "bot add":
		ctrl.AddBot()
	case cmd == "bot remove":
		ctrl.RemoveBot()
	case cmd == "status":
		fmt.Println(ctrl.Status())
	case strings.HasPrefix(cmd, "sleep "):
		d, err := time.ParseDuration(strings.TrimPrefix(cmd, "sleep "))
		if err != nil {
			return err
		}
		time.Sleep(d)
	default:
		return fmt.Errorf("unknown")
	}
	return nil
}
