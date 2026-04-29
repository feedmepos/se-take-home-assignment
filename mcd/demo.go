package mcd

import (
	"fmt"
	"os"
	"time"
)

const demoOrderCount = 4

// RunDemo executes a scripted demonstration scenario
func RunDemo(processDuration time.Duration) {
	ctrl := NewControllerWithClock(os.Stdout, RealClock{}, processDuration)
	defer ctrl.Close()

	fmt.Println("McDonald's Order Management System - Demo Mode")
	fmt.Println()

	// t=0: Add bot #1
	ctrl.AddBot()

	// t=100ms: Create Normal #1 (bot1 picks it up immediately)
	time.Sleep(100 * time.Millisecond)
	ctrl.NewNormalOrder()

	// t=150ms: Create VIP #2 (goes to pending, #1 is being processed)
	time.Sleep(50 * time.Millisecond)
	ctrl.NewVIPOrder()

	// t=200ms: Add bot #2 (picks up VIP #2 immediately)
	time.Sleep(50 * time.Millisecond)
	ctrl.AddBot()

	// t=250ms: Create Normal #3 and VIP #4
	time.Sleep(50 * time.Millisecond)
	ctrl.NewNormalOrder()
	ctrl.NewVIPOrder()

	// t=300ms: Remove bot #2 (interrupts VIP #2, returns to pending)
	time.Sleep(50 * time.Millisecond)
	ctrl.RemoveBot()

	waitForDemoCompletion(ctrl, processDuration)

	// Print final status
	fmt.Println("\n=== Final Status ===")
	ctrl.PrintStatus()
}

func waitForDemoCompletion(ctrl *Controller, processDuration time.Duration) {
	deadline := time.Now().Add(processDuration*5 + time.Second)

	for time.Now().Before(deadline) {
		snap := ctrl.Snapshot()
		allIdle := true
		for _, bot := range snap.Bots {
			if bot.CurrentOrder != nil {
				allIdle = false
				break
			}
		}

		if len(snap.Pending) == 0 && len(snap.Completed) == demoOrderCount && allIdle {
			return
		}

		time.Sleep(10 * time.Millisecond)
	}
}
