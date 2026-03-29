package main

import (
	"fmt"
	"io"
	"os"
	"time"
)

func main() {
	f, err := os.Create("scripts/result.txt")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to open result.txt: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	out := io.MultiWriter(os.Stdout, f)
	ctrl := NewController(10*time.Second, out)

	fmt.Fprintln(out, "=== McDonald's Order Controller Simulation ===")
	fmt.Fprintln(out)

	// ── Phase 1: order priority ──────────────────────────────────────────────
	// Req 1 & 2: Normal orders append to end; VIP orders jump before Normals.
	fmt.Fprintln(out, "--- Phase 1: Order Priority ---")
	ctrl.NewOrder(Normal) // #1
	ctrl.NewOrder(Normal) // #2
	ctrl.NewOrder(VIP)    // #3 — should be at position 1, ahead of #1 and #2
	ctrl.PrintStatus()
	// Expected pending: [VIP#3, Normal#1, Normal#2]

	// ── Phase 2: bots process in priority order ──────────────────────────────
	// Req 3 & 4: bots pick from the front (VIP first), process for 10 s.
	fmt.Fprintln(out, "--- Phase 2: Bots Processing ---")
	ctrl.AddBot() // Bot #1 picks up VIP#3
	ctrl.AddBot() // Bot #2 picks up Normal#1
	ctrl.PrintStatus()
	// Pending: [Normal#2]

	time.Sleep(2 * time.Second)

	// Req 2 again: new VIP order must jump ahead of pending Normal orders.
	ctrl.NewOrder(VIP) // #4 — goes before Normal#2
	ctrl.PrintStatus()
	// Pending: [VIP#4, Normal#2]

	// Wait for first batch to complete (≈10 s from AddBot).
	time.Sleep(9 * time.Second)
	// Bot #1 completes VIP#3 → picks up VIP#4
	// Bot #2 completes Normal#1 → picks up Normal#2
	ctrl.PrintStatus()

	// ── Phase 3: remove bot while processing ────────────────────────────────
	// Req 6: removing a busy bot returns its order to pending.
	fmt.Fprintln(out, "--- Phase 3: Bot Removal ---")
	ctrl.RemoveBot() // removes Bot #2 (newest), Normal#2 returned to pending
	ctrl.PrintStatus()

	// Bot #1 still running; wait for all remaining orders to finish.
	ctrl.WaitForIdle()
	ctrl.PrintStatus()

	// ── Phase 4: idle bot picks up a new order ───────────────────────────────
	// Req 5: idle bot must resume as soon as a new order arrives.
	fmt.Fprintln(out, "--- Phase 4: Idle Bot Resumes ---")
	ctrl.NewOrder(Normal) // #5 — should be picked up by Bot #1 immediately
	ctrl.PrintStatus()

	ctrl.WaitForIdle()

	// ── Final summary ────────────────────────────────────────────────────────
	fmt.Fprintln(out)
	fmt.Fprintln(out, "=== Simulation Complete ===")
	ctrl.PrintStatus()
}
