package simulation

import (
	"fmt"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/controller"
)

func Run(ctrl *controller.Controller) {
	ts := func() string {
		return time.Now().Format("15:04:05")
	}

	fmt.Printf("[%s] System initialized with 0 bots\n", ts())

	// Add Normal Order #1001
	n1 := ctrl.AddNormalOrder()
	fmt.Printf("[%s] Normal Order #%d added → PENDING\n", ts(), n1.ID)
	time.Sleep(1 * time.Second)

	// Add VIP Order #1002
	v1 := ctrl.AddVIPOrder()
	fmt.Printf("[%s] VIP Order #%d added → PENDING\n", ts(), v1.ID)
	time.Sleep(1 * time.Second)

	// Add Normal Order #1003
	n2 := ctrl.AddNormalOrder()
	fmt.Printf("[%s] Normal Order #%d added → PENDING\n", ts(), n2.ID)
	time.Sleep(1 * time.Second)

	// Add Bot #1 — picks VIP #1002 (completes ~13s from start)
	b1 := ctrl.AddBot()
	fmt.Printf("[%s] Bot #1 created → PROCESSING VIP Order #%d\n", ts(), v1.ID)
	time.Sleep(1 * time.Second)

	// Add Bot #2 — picks Normal #1001 (completes ~14s from start)
	b2 := ctrl.AddBot()
	fmt.Printf("[%s] Bot #2 created → PROCESSING Normal Order #%d\n", ts(), n1.ID)
	_ = b1
	_ = b2

	// Wait for Bot #1 to finish VIP #1002 (~t=13s, 9s from now)
	time.Sleep(9 * time.Second)

	fmt.Printf("[%s] Bot #1 completed VIP Order #%d → COMPLETE\n", ts(), v1.ID)
	// Bot #1 picks Normal #1003
	fmt.Printf("[%s] Bot #1 started Normal Order #%d → PROCESSING\n", ts(), n2.ID)

	// Wait for Bot #2 to finish Normal #1001 (~t=14s, 1s from now)
	time.Sleep(1 * time.Second)
	fmt.Printf("[%s] Bot #2 completed Normal Order #%d → COMPLETE\n", ts(), n1.ID)
	fmt.Printf("[%s] Bot #2 is now IDLE — no pending orders\n", ts())

	time.Sleep(1 * time.Second)

	// Add VIP Order #1004 — wakes Bot #2
	v2 := ctrl.AddVIPOrder()
	fmt.Printf("[%s] VIP Order #%d added → PENDING\n", ts(), v2.ID)
	time.Sleep(100 * time.Millisecond)
	fmt.Printf("[%s] Bot #2 started VIP Order #%d → PROCESSING\n", ts(), v2.ID)

	// Wait for Bot #1 to finish Normal #1003 (~t=23s, 8s from now)
	time.Sleep(8 * time.Second)
	fmt.Printf("[%s] Bot #1 completed Normal Order #%d → COMPLETE\n", ts(), n2.ID)
	fmt.Printf("[%s] Bot #1 is now IDLE — no pending orders\n", ts())

	// Wait for Bot #2 to finish VIP #1004 (~t=25s, 2s from now)
	time.Sleep(2 * time.Second)
	fmt.Printf("[%s] Bot #2 completed VIP Order #%d → COMPLETE\n", ts(), v2.ID)
	time.Sleep(1 * time.Second)

	// Remove bots
	ctrl.RemoveBot() // Bot #2
	fmt.Printf("[%s] Bot #2 removed (was idle)\n", ts())
	ctrl.RemoveBot() // Bot #1
	fmt.Printf("[%s] Bot #1 removed (was idle)\n", ts())

	// Final status
	fmt.Printf("\nFinal Status:\n")
	fmt.Printf("- Total Orders: 4 (2 VIP, 2 Normal)\n")
	fmt.Printf("- Completed: %d\n", ctrl.CompletedCount())
	fmt.Printf("- Active Bots: %d\n", ctrl.BotCount())
	fmt.Printf("- Pending: 0\n")
}
