package sim

import (
	"fmt"
	"io"
	"time"

	"mcd-order-controller/internal/controller"
	"mcd-order-controller/internal/order"
)

// Run executes a scripted scenario that exercises every requirement in the
// README. It is used by scripts/run.sh to produce scripts/result.txt for CI.
// procTime is the per-order cooking time (use a small value in CI; the spec
// behavior is 10s).
func Run(out io.Writer, procTime time.Duration) {
	header := fmt.Sprintf(
		"McDonald's Order Management System - Simulation Results\n"+
			"(per-order processing time = %s)\n\n",
		procTime,
	)
	_, _ = io.WriteString(out, header)

	log := controller.NewLogger(time.Now, out)
	c := controller.New(controller.Config{
		ProcessTime: procTime,
		Logger:      log,
	})

	step := func(msg string) {
		log.Logf("--- %s ---", msg)
	}

	step("Submitting initial orders (Normal, VIP, Normal)")
	c.SubmitOrder(order.Normal)
	c.SubmitOrder(order.VIP)
	c.SubmitOrder(order.Normal)

	step("Adding two bots")
	c.AddBot()
	c.AddBot()

	wait(procTime * 3 / 2)

	step("Submitting a late VIP order")
	c.SubmitOrder(order.VIP)

	wait(procTime / 4)

	step("Removing newest bot mid-processing (order returns to PENDING)")
	if _, err := c.RemoveBot(); err != nil {
		log.Logf("remove bot error: %s", err)
	}

	wait(procTime * 3)

	step("Adding a bot to drain the queue")
	c.AddBot()

	wait(procTime * 2)

	step("Removing remaining bot while IDLE")
	if _, err := c.RemoveBot(); err != nil {
		log.Logf("remove bot error: %s", err)
	}
	if _, err := c.RemoveBot(); err != nil {
		log.Logf("remove bot error: %s", err)
	}

	c.Shutdown()

	snap := c.Snapshot()
	_, _ = io.WriteString(out, "\n")
	_, _ = io.WriteString(out, controller.FormatSnapshot(snap))
}

func wait(d time.Duration) {
	if d <= 0 {
		return
	}
	time.Sleep(d)
}
