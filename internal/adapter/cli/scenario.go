// Package cli is the command-line delivery adapter. It provides a deterministic
// scripted scenario (used by CI) and an interactive REPL, both driving the same
// OrderController.
package cli

import (
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/KhanitthaK/feedme-backend-service/internal/domain"
	"github.com/KhanitthaK/feedme-backend-service/internal/usecase"
)

// ts returns the current wall-clock time as HH:MM:SS.
func ts() string { return time.Now().Format("15:04:05") }

// logf writes one timestamped event line.
func logf(w io.Writer, format string, a ...any) {
	fmt.Fprintf(w, "[%s] %s\n", ts(), fmt.Sprintf(format, a...))
}

func fmtOrders(os []domain.Order) string {
	if len(os) == 0 {
		return "-"
	}
	parts := make([]string, 0, len(os))
	for _, o := range os {
		parts = append(parts, fmt.Sprintf("#%d(%s)", o.ID, o.Type))
	}
	return strings.Join(parts, ", ")
}

func fmtBots(bots []usecase.BotView) string {
	if len(bots) == 0 {
		return "-"
	}
	parts := make([]string, 0, len(bots))
	for _, b := range bots {
		if b.Bot.Status == domain.BotStatusProcessing && b.Bot.CurrentOrderID != nil {
			rem := 0
			if b.RemainingSeconds != nil {
				rem = *b.RemainingSeconds
			}
			parts = append(parts, fmt.Sprintf("bot%d->#%d(%ds)", b.Bot.ID, *b.Bot.CurrentOrderID, rem))
		} else {
			parts = append(parts, fmt.Sprintf("bot%d(IDLE)", b.Bot.ID))
		}
	}
	return strings.Join(parts, ", ")
}

// printState logs a one-line snapshot of the whole controller state.
func printState(w io.Writer, c *usecase.OrderController) {
	s := c.GetState()
	logf(w, "STATE  pending:[%s]  processing:[%s]  complete:[%s]  bots:[%s]",
		fmtOrders(s.Pending), fmtOrders(s.Processing), fmtOrders(s.Complete), fmtBots(s.Bots))
}

// RunScenario runs a deterministic scripted scenario that exercises every
// requirement, logging each event with a real HH:MM:SS wall-clock timestamp. A
// short processing duration keeps CI runtime modest while timestamps remain
// real wall-clock.
func RunScenario(w io.Writer) {
	const dur = 2 * time.Second
	c := usecase.NewOrderController(usecase.NewRealClock(), dur)

	logf(w, "=== McDonald's Order Controller — scenario (processing duration = %s) ===", dur)

	// --- Priority: VIP jumps ahead of NORMALs -------------------------------
	logf(w, "STEP 1: create 2 NORMAL then 1 VIP order (VIP must jump the queue)")
	n1, _ := c.CreateOrder(domain.OrderTypeNormal)
	logf(w, "created order #%d NORMAL", n1.ID)
	n2, _ := c.CreateOrder(domain.OrderTypeNormal)
	logf(w, "created order #%d NORMAL", n2.ID)
	v3, _ := c.CreateOrder(domain.OrderTypeVIP)
	logf(w, "created order #%d VIP", v3.ID)
	printState(w, c) // pending should be VIP #3 first, then NORMAL #1, #2

	// --- Add bots, watch orders move to processing --------------------------
	logf(w, "STEP 2: add bot #1 (should immediately grab VIP #%d)", v3.ID)
	b1 := c.AddBot()
	logf(w, "added bot #%d", b1.ID)
	time.Sleep(300 * time.Millisecond)
	printState(w, c)

	logf(w, "STEP 3: add bot #2 (should grab NORMAL #%d)", n1.ID)
	b2 := c.AddBot()
	logf(w, "added bot #%d", b2.ID)
	time.Sleep(300 * time.Millisecond)
	printState(w, c)

	// --- Watch orders complete ---------------------------------------------
	logf(w, "STEP 4: wait for cooking to finish...")
	time.Sleep(dur + 600*time.Millisecond) // first two complete; a bot picks #2
	printState(w, c)
	time.Sleep(dur + 600*time.Millisecond) // last order completes
	printState(w, c)

	// --- Remove a bot to reduce to a single bot (deterministic requeue) -----
	logf(w, "STEP 5: remove newest bot (both idle now) to leave a single bot")
	rid, _ := c.RemoveBot()
	logf(w, "removed bot #%d", rid)
	printState(w, c)

	// --- Add another order, then remove the bot mid-processing --------------
	logf(w, "STEP 6: add another VIP order, then remove the bot WHILE it cooks")
	v4, _ := c.CreateOrder(domain.OrderTypeVIP)
	logf(w, "created order #%d VIP", v4.ID)
	time.Sleep(300 * time.Millisecond)
	printState(w, c) // the single bot should now be processing #4
	rid2, _ := c.RemoveBot()
	logf(w, "removed bot #%d mid-processing -> order #%d must return to pending", rid2, v4.ID)
	printState(w, c) // #4 back in pending, no bots, nothing processing

	// --- Add a fresh bot to finish the requeued order -----------------------
	logf(w, "STEP 7: add a fresh bot to finish the requeued order")
	b3 := c.AddBot()
	logf(w, "added bot #%d", b3.ID)
	time.Sleep(dur + 600*time.Millisecond)
	printState(w, c)

	// --- Summary ------------------------------------------------------------
	s := c.GetState()
	logf(w, "=== Summary: %d completed, %d pending, %d processing, %d active bot(s) ===",
		len(s.Complete), len(s.Pending), len(s.Processing), len(s.Bots))
	logf(w, "completed orders (in completion order): %s", fmtOrders(s.Complete))

	c.Reset() // stop remaining bot goroutines cleanly
	logf(w, "scenario finished")
}
