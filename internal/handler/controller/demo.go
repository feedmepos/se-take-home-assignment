package controller

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"feedme-order-controller/internal/handler/dto"
	"feedme-order-controller/internal/usecase"
)

// settleDelay is a brief pause between demo steps purely for stable,
// human-readable log ordering (the usecase logs lifecycle events from its
// own worker goroutines, so a short settle avoids interleaving those lines
// with the next step's status render).
const settleDelay = 80 * time.Millisecond

// RunDemo executes a deterministic scripted scenario against c, exercising
// every assignment requirement (VIP priority, bot pickup, mid-processing
// bot removal and requeue, idle bot removal, and final summary). It paces
// itself relative to processingTime so the bots have time to actually
// process orders between steps, and checks ctx.Done() between every step so
// Ctrl-C (SIGINT/SIGTERM, wired through context in main) stops the demo
// promptly.
//
// RunDemo is a thin driver: it only sequences calls to Controller methods
// and renders the dto responses via the presenter (renderStatus/
// renderFinalSummary) — all business logic and dto mapping live in the
// Controller and presenter, not here.
func RunDemo(ctx context.Context, c *Controller, processingTime time.Duration, out io.Writer) error {
	// wait is long enough for a bot to finish exactly one order.
	wait := processingTime + 200*time.Millisecond

	// shutdown is the single exit path for the scenario — every return
	// (including early Ctrl-C exits) stops all bots gracefully and renders
	// the final summary.
	shutdown := func() error {
		renderFinalSummary(out, c.Shutdown())
		return nil
	}

	fmt.Fprintln(out, "=== FeedMe Order Controller Demo ===")

	// 1. Create Normal, VIP, Normal. VIP jumps ahead of both Normals in
	// the pending queue.
	c.CreateOrder(dto.CreateOrderRequest{Type: "normal"})
	c.CreateOrder(dto.CreateOrderRequest{Type: "vip"})
	c.CreateOrder(dto.CreateOrderRequest{Type: "normal"})
	if sleepOrDone(ctx, settleDelay) {
		return shutdown()
	}

	// 2. Render status: VIP should be first in the pending queue.
	renderStatus(out, c.GetStatus())
	if sleepOrDone(ctx, settleDelay) {
		return shutdown()
	}

	// 3. Add 3 bots. Each immediately picks up pending work; the 3rd bot
	// takes the last (3rd) order, draining the queue.
	c.AddBot()
	c.AddBot()
	c.AddBot()
	if sleepOrDone(ctx, settleDelay) {
		return shutdown()
	}
	renderStatus(out, c.GetStatus())

	// 4. Create one more VIP order while all bots are busy (it must wait
	// in the pending queue), then 5. immediately remove the newest bot
	// while it's still mid-processing: its in-flight order returns to
	// pending at its correct priority position (VIP ahead of Normal).
	// These two steps are deliberately back-to-back with no sleep in
	// between so the removal reliably lands mid-processing even when
	// --processing-time is very short.
	c.CreateOrder(dto.CreateOrderRequest{Type: "vip"})
	if err := removeBot(c, out); err != nil {
		return shutdown()
	}
	if sleepOrDone(ctx, settleDelay) {
		return shutdown()
	}
	renderStatus(out, c.GetStatus())

	// 6. Wait for the remaining 2 bots to finish their current orders and
	// drain the rest of the pending queue (the requeued order and the new
	// VIP; the idle bot wakes and the VIP is processed before the
	// requeued Normal since both are pending).
	if sleepOrDone(ctx, 2*wait) {
		return shutdown()
	}
	renderStatus(out, c.GetStatus())
	if sleepOrDone(ctx, settleDelay) {
		return shutdown()
	}

	// 7. Remove a bot while it is IDLE.
	if err := removeBot(c, out); err != nil {
		return shutdown()
	}
	if sleepOrDone(ctx, settleDelay) {
		return shutdown()
	}

	// 8. Shut down and render the final summary.
	return shutdown()
}

// removeBot removes the newest bot via c.RemoveBot(), printing a friendly
// message for usecase.ErrNoBots and any other error to out. It returns a
// non-nil error only to let the caller short-circuit the scenario;
// ErrNoBots is treated as a benign, reportable condition rather than a
// fatal one.
func removeBot(c *Controller, out io.Writer) error {
	if _, err := c.RemoveBot(); err != nil {
		if errors.Is(err, usecase.ErrNoBots) {
			fmt.Fprintln(out, "no bots to remove")
			return nil
		}
		fmt.Fprintln(out, "error removing bot:", err)
		return err
	}
	return nil
}

// sleepOrDone sleeps for d, returning early (with true) if ctx is
// cancelled first, so long demo pauses stay responsive to Ctrl-C.
func sleepOrDone(ctx context.Context, d time.Duration) bool {
	select {
	case <-ctx.Done():
		return true
	case <-time.After(d):
		return false
	}
}
