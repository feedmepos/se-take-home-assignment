package test

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/exc/mcd-order-controller/mcd"
)

func TestControllerBasicFlow(t *testing.T) {
	var buf bytes.Buffer
	sw := mcd.NewSafeWriter(&buf)
	clock := mcd.NewFakeClock(time.Date(2024, 1, 1, 9, 0, 0, 0, time.UTC))
	ctrl := mcd.NewControllerWithClock(sw, clock, 10*time.Second)
	defer ctrl.Close()

	// Add a bot
	bot := ctrl.AddBot()
	if bot == nil {
		t.Fatal("AddBot() returned nil")
	}

	// Create a normal order
	order := ctrl.NewNormalOrder()
	if order == nil {
		t.Fatal("NewNormalOrder() returned nil")
	}

	// Wait for processing to start
	time.Sleep(50 * time.Millisecond)

	// Advance clock to complete the order
	clock.Advance(10 * time.Second)
	time.Sleep(50 * time.Millisecond)

	output := sw.String()
	if !strings.Contains(output, "bot #1 created") {
		t.Error("Expected bot created message")
	}
	if !strings.Contains(output, "order #1") && !strings.Contains(output, "created") {
		t.Error("Expected order created message")
	}
	if !strings.Contains(output, "bot #1 picked up order #1") {
		t.Error("Expected order picked up message")
	}
	if !strings.Contains(output, "bot #1 completed order #1") {
		t.Error("Expected order completed message")
	}
}

func TestControllerVIPPriority(t *testing.T) {
	var buf bytes.Buffer
	sw := mcd.NewSafeWriter(&buf)
	clock := mcd.NewFakeClock(time.Date(2024, 1, 1, 9, 0, 0, 0, time.UTC))
	ctrl := mcd.NewControllerWithClock(sw, clock, 10*time.Second)
	defer ctrl.Close()

	// Create orders: Normal, VIP, Normal
	ctrl.NewNormalOrder() // #1
	ctrl.NewVIPOrder()    // #2
	ctrl.NewNormalOrder() // #3

	// Add bot - should pick VIP first
	ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	output := sw.String()
	if !strings.Contains(output, "bot #1 picked up order #2") {
		t.Error("Expected bot to pick up VIP order #2 first")
	}
}

func TestControllerBotRemoval(t *testing.T) {
	var buf bytes.Buffer
	clock := mcd.NewFakeClock(time.Date(2024, 1, 1, 9, 0, 0, 0, time.UTC))
	ctrl := mcd.NewControllerWithClock(&buf, clock, 10*time.Second)
	defer ctrl.Close()

	// Add two bots
	ctrl.AddBot() // #1
	ctrl.AddBot() // #2

	// Remove newest bot
	removed := ctrl.RemoveBot()
	if removed == nil {
		t.Fatal("RemoveBot() returned nil")
	}
	if removed.ID != 2 {
		t.Errorf("Expected to remove bot #2, got #%d", removed.ID)
	}

	// Try to remove when no bots available
	ctrl.RemoveBot() // Remove #1
	removed = ctrl.RemoveBot()
	if removed != nil {
		t.Error("Expected RemoveBot() to return nil when no bots available")
	}
}

func TestControllerInterruptedOrder(t *testing.T) {
	var buf bytes.Buffer
	sw := mcd.NewSafeWriter(&buf)
	clock := mcd.NewFakeClock(time.Date(2024, 1, 1, 9, 0, 0, 0, time.UTC))
	ctrl := mcd.NewControllerWithClock(sw, clock, 10*time.Second)
	defer ctrl.Close()

	// Add bot and create order
	ctrl.AddBot()
	ctrl.NewNormalOrder() // #1

	// Wait for bot to pick up order
	time.Sleep(50 * time.Millisecond)

	// Remove bot while processing - order should be interrupted
	ctrl.RemoveBot()
	time.Sleep(50 * time.Millisecond)

	output := sw.String()
	if !strings.Contains(output, "bot #1 picked up order #1") {
		t.Error("Expected bot to pick up order")
	}
	if !strings.Contains(output, "interrupted") && !strings.Contains(output, "returned to pending") {
		t.Error("Expected order to be interrupted")
	}
	if !strings.Contains(output, "bot #1 destroyed") {
		t.Error("Expected bot to be destroyed")
	}
}

func TestControllerMultipleBots(t *testing.T) {
	var buf bytes.Buffer
	sw := mcd.NewSafeWriter(&buf)
	clock := mcd.NewFakeClock(time.Date(2024, 1, 1, 9, 0, 0, 0, time.UTC))
	ctrl := mcd.NewControllerWithClock(sw, clock, 10*time.Second)
	defer ctrl.Close()

	// Create multiple orders
	ctrl.NewNormalOrder() // #1
	ctrl.NewNormalOrder() // #2
	ctrl.NewNormalOrder() // #3

	// Add multiple bots
	ctrl.AddBot() // #1
	ctrl.AddBot() // #2

	// Wait for bots to pick up orders
	time.Sleep(50 * time.Millisecond)

	output := sw.String()

	// Both bots should pick up orders
	pickupCount := strings.Count(output, "picked up order")
	if pickupCount < 2 {
		t.Errorf("Expected at least 2 orders picked up, got %d", pickupCount)
	}
}
