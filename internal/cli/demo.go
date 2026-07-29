package cli

import (
	"fmt"
	"time"
)

func (c *CLI) RunDemo() error {
	c.log("System initialized with 0 bots")

	c.ctrl.CreateNormalOrder()
	c.ctrl.CreateVIPOrder()
	c.ctrl.CreateNormalOrder()
	c.printStatus()

	c.ctrl.AddBot()
	c.ctrl.AddBot()

	waitUntil(func() bool {
		s := c.ctrl.Snapshot()
		return len(s.Complete) >= 2
	}, 3*time.Second)

	c.ctrl.CreateVIPOrder()

	waitUntil(func() bool {
		s := c.ctrl.Snapshot()
		return len(s.Complete) == 4 && len(s.Pending) == 0
	}, 3*time.Second)

	c.ctrl.RemoveBot()

	waitUntil(func() bool {
		s := c.ctrl.Snapshot()
		return len(s.Pending) == 0 && len(s.Complete) == 4 && len(s.Bots) == 1
	}, 2*time.Second)

	snap := c.ctrl.Snapshot()
	fmt.Fprintln(c.out, "")
	fmt.Fprintln(c.out, "Final Status:")
	fmt.Fprintf(c.out, "- Orders Completed: %d\n", len(snap.Complete))
	fmt.Fprintf(c.out, "- Active Bots: %d\n", len(snap.Bots))
	fmt.Fprintf(c.out, "- Pending Orders: %d\n", len(snap.Pending))
	return nil
}

func waitUntil(cond func() bool, timeout time.Duration) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
}
