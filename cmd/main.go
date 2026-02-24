package main

import (
	"fmt"
	"io"
	"os"
	"sync"
	"time"

	"github.com/dnisting/se-take-home-assignment/internal/controller"
)

func main() {
	// Auto-save output to scripts/result.txt
	file, err := os.Create("scripts/result.txt")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Warning: could not create scripts/result.txt: %v (writing to terminal only)\n", err)
		file = nil
	}
	if file != nil {
		defer file.Close()
	}

	// Write to both terminal and file simultaneously
	var w io.Writer
	if file != nil {
		w = io.MultiWriter(os.Stdout, file)
	} else {
		w = os.Stdout
	}

	var mu sync.Mutex
	logFunc := func(format string, args ...any) {
		mu.Lock()
		defer mu.Unlock()
		ts := time.Now().Format("15:04:05")
		fmt.Fprintf(w, "[%s] %s\n", ts, fmt.Sprintf(format, args...))
	}

	fmt.Fprintln(w, "McDonald's Order Management System - Simulation Results")
	fmt.Fprintln(w)

	c := controller.New(logFunc)
	logFunc("System initialized with 0 bots")

	// Create 3 orders: Normal, VIP, Normal
	c.NewNormalOrder() // #1001
	time.Sleep(1 * time.Second)
	c.NewVIPOrder() // #1002
	c.NewNormalOrder() // #1003
	time.Sleep(1 * time.Second)

	// Add 2 bots — Bot #1 picks up VIP #1002, Bot #2 picks up Normal #1001
	c.AddBot()
	time.Sleep(1 * time.Second)
	c.AddBot()

	// Wait for processing to complete (~10 seconds)
	time.Sleep(11 * time.Second)

	// Create another VIP order — idle bot picks it up
	c.NewVIPOrder() // #1004
	time.Sleep(11 * time.Second)

	// Remove newest bot (Bot #2)
	c.RemoveBot()
	time.Sleep(1 * time.Second)

	// Get final status
	total, completed, activeBots, pending, vip, normal := c.GetStatus()

	fmt.Fprintln(w)
	fmt.Fprintln(w, "Final Status:")
	fmt.Fprintf(w, "- Total Orders Processed: %d (%d VIP, %d Normal)\n", total, vip, normal)
	fmt.Fprintf(w, "- Orders Completed: %d\n", completed)
	fmt.Fprintf(w, "- Active Bots: %d\n", activeBots)
	fmt.Fprintf(w, "- Pending Orders: %d\n", pending)

	c.Shutdown()
}
