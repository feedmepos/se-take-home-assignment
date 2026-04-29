package test

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/exc/mcd-order-controller/mcd"
)

func TestDemoScenario(t *testing.T) {
	// Capture demo output
	var buf bytes.Buffer
	sw := mcd.NewSafeWriter(&buf)

	// Run demo with fast processing (500ms)
	// We can't easily capture the demo output since it creates its own controller
	// So we'll test the demo scenario manually

	clock := mcd.NewFakeClock(time.Date(2024, 1, 1, 9, 0, 0, 0, time.UTC))
	ctrl := mcd.NewControllerWithClock(sw, clock, 500*time.Millisecond)
	defer ctrl.Close()

	// Simulate demo scenario
	// T=0: Add bot #1
	ctrl.AddBot()
	time.Sleep(10 * time.Millisecond)

	// T=1: Add bot #2, create Normal #1
	clock.Advance(1 * time.Second)
	ctrl.AddBot()
	ctrl.NewNormalOrder()
	time.Sleep(10 * time.Millisecond)

	// T=2: Create VIP #2
	clock.Advance(1 * time.Second)
	ctrl.NewVIPOrder()
	time.Sleep(10 * time.Millisecond)

	// T=3: Create Normal #3
	clock.Advance(1 * time.Second)
	ctrl.NewNormalOrder()
	time.Sleep(10 * time.Millisecond)

	// T=4: Remove bot #2
	clock.Advance(1 * time.Second)
	ctrl.RemoveBot()
	time.Sleep(10 * time.Millisecond)

	// Advance time to let orders complete
	clock.Advance(10 * time.Second)
	time.Sleep(50 * time.Millisecond)

	output := sw.String()

	// Verify key events occurred
	if !strings.Contains(output, "bot #1 created") {
		t.Error("Expected bot #1 to be created")
	}
	if !strings.Contains(output, "bot #2 created") {
		t.Error("Expected bot #2 to be created")
	}
	if !strings.Contains(output, "order #1") {
		t.Error("Expected order #1 to be created")
	}
	if !strings.Contains(output, "order #2") {
		t.Error("Expected order #2 (VIP) to be created")
	}
	if !strings.Contains(output, "order #3") {
		t.Error("Expected order #3 to be created")
	}
	if !strings.Contains(output, "bot #2 destroyed") {
		t.Error("Expected bot #2 to be removed")
	}
}

func TestDemoVIPPriorityHandling(t *testing.T) {
	var buf bytes.Buffer
	sw := mcd.NewSafeWriter(&buf)
	clock := mcd.NewFakeClock(time.Date(2024, 1, 1, 9, 0, 0, 0, time.UTC))
	ctrl := mcd.NewControllerWithClock(sw, clock, 500*time.Millisecond)
	defer ctrl.Close()

	// Create Normal order first
	ctrl.NewNormalOrder() // #1
	time.Sleep(10 * time.Millisecond)

	// Create VIP order - should jump to front
	ctrl.NewVIPOrder() // #2
	time.Sleep(10 * time.Millisecond)

	// Add bot - should pick VIP first
	ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	// Advance clock to complete VIP order
	clock.Advance(500 * time.Millisecond)
	time.Sleep(50 * time.Millisecond)

	// Advance clock to complete Normal order
	clock.Advance(500 * time.Millisecond)
	time.Sleep(50 * time.Millisecond)

	output := sw.String()

	// Find the position of pickup messages
	vipPickup := strings.Index(output, "picked up order #2")
	normalPickup := strings.Index(output, "picked up order #1")

	if vipPickup == -1 {
		t.Error("Expected VIP order #2 to be picked up")
	}
	if normalPickup == -1 {
		t.Error("Expected Normal order #1 to be picked up")
	}
	if vipPickup > normalPickup {
		t.Error("Expected VIP order #2 to be picked up before Normal order #1")
	}
}

func TestDemoInterruptedOrderRequeue(t *testing.T) {
	var buf bytes.Buffer
	sw := mcd.NewSafeWriter(&buf)
	clock := mcd.NewFakeClock(time.Date(2024, 1, 1, 9, 0, 0, 0, time.UTC))
	ctrl := mcd.NewControllerWithClock(sw, clock, 10*time.Second)
	defer ctrl.Close()

	// Create two normal orders
	ctrl.NewNormalOrder() // #1
	ctrl.NewNormalOrder() // #2
	time.Sleep(10 * time.Millisecond)

	// Add bot - picks up order #1
	ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	// Remove bot - interrupts order #1
	ctrl.RemoveBot()
	time.Sleep(50 * time.Millisecond)

	// Add new bot - should pick up order #1 again (not #2)
	ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	output := sw.String()

	// Verify order #1 was interrupted and re-picked
	if !strings.Contains(output, "interrupted") || !strings.Contains(output, "order #1") {
		t.Error("Expected order #1 to be interrupted")
	}

	// Count how many times order #1 was picked up (should be 2)
	pickupCount := strings.Count(output, "picked up order #1")
	if pickupCount < 2 {
		t.Errorf("Expected order #1 to be picked up at least twice, got %d", pickupCount)
	}
}
