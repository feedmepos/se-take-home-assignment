package controller

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/urfave/cli/v3"

	"feedme-order-controller/internal/usecase"
)

// settleDelay is a brief pause between demo steps purely for stable,
// human-readable log ordering (the usecase logs lifecycle events from its
// own worker goroutines, so a short settle avoids interleaving those lines
// with the next step's status render).
const settleDelay = 80 * time.Millisecond

// NewDemoCommand builds the "demo" subcommand: a deterministic scripted
// scenario that drives the order/bot usecase ports directly, exercising
// every assignment requirement (VIP priority, bot pickup, mid-processing
// bot removal and requeue, idle bot removal, and final summary).
func NewDemoCommand() *cli.Command {
	return &cli.Command{
		Name:  "demo",
		Usage: "run a deterministic scripted demo scenario",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			processingTime := resolveProcessingTime(cmd)
			uc := wire(processingTime)
			return runDemo(ctx, uc, uc, processingTime, cmd.Writer)
		},
	}
}

// runDemo executes the scripted scenario, pacing itself relative to
// processingTime so the bots have time to actually process orders between
// steps. It checks ctx.Done() between every step so Ctrl-C (SIGINT/SIGTERM,
// wired through context in main) stops the demo promptly.
func runDemo(ctx context.Context, orders OrderUsecase, bots BotUsecase, processingTime time.Duration, out io.Writer) error {
	// wait is long enough for a bot to finish exactly one order.
	wait := processingTime + 200*time.Millisecond

	// shutdown is the single exit path for the scenario — every return
	// (including early Ctrl-C exits) stops all bots gracefully and renders
	// the final summary.
	shutdown := func() error {
		renderFinalSummary(out, bots.Shutdown())
		return nil
	}

	fmt.Fprintln(out, "=== FeedMe Order Controller Demo ===")

	// 1. Create Normal, VIP, Normal. VIP jumps ahead of both Normals in
	// the pending queue.
	orders.NewNormalOrder()
	orders.NewVIPOrder()
	orders.NewNormalOrder()
	if sleepOrDone(ctx, settleDelay) {
		return shutdown()
	}

	// 2. Render status: VIP should be first in the pending queue.
	renderStatus(out, orders.Status())
	if sleepOrDone(ctx, settleDelay) {
		return shutdown()
	}

	// 3. Add 3 bots. Each immediately picks up pending work; the 3rd bot
	// takes the last (3rd) order, draining the queue.
	bots.AddBot()
	bots.AddBot()
	bots.AddBot()
	if sleepOrDone(ctx, settleDelay) {
		return shutdown()
	}
	renderStatus(out, orders.Status())

	// 4. Create one more VIP order while all bots are busy (it must wait
	// in the pending queue), then 5. immediately remove the newest bot
	// while it's still mid-processing: its in-flight order returns to
	// pending at its correct priority position (VIP ahead of Normal).
	// These two steps are deliberately back-to-back with no sleep in
	// between so the removal reliably lands mid-processing even when
	// --processing-time is very short.
	orders.NewVIPOrder()
	if err := removeBot(bots, out); err != nil {
		return shutdown()
	}
	if sleepOrDone(ctx, settleDelay) {
		return shutdown()
	}
	renderStatus(out, orders.Status())

	// 6. Wait for the remaining 2 bots to finish their current orders and
	// drain the rest of the pending queue (the requeued order and the new
	// VIP; the idle bot wakes and the VIP is processed before the
	// requeued Normal since both are pending).
	if sleepOrDone(ctx, 2*wait) {
		return shutdown()
	}
	renderStatus(out, orders.Status())
	if sleepOrDone(ctx, settleDelay) {
		return shutdown()
	}

	// 7. Remove a bot while it is IDLE.
	if err := removeBot(bots, out); err != nil {
		return shutdown()
	}
	if sleepOrDone(ctx, settleDelay) {
		return shutdown()
	}

	// 8. Shut down and render the final summary.
	return shutdown()
}

// removeBot removes the newest bot, printing a friendly message for
// usecase.ErrNoBots and any other error to out. It returns a non-nil error
// only to let the caller short-circuit the scenario; ErrNoBots is treated
// as a benign, reportable condition rather than a fatal one.
func removeBot(bots BotUsecase, out io.Writer) error {
	if _, err := bots.RemoveBot(); err != nil {
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
