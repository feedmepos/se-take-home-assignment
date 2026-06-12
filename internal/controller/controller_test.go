package controller

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/se-take-home-assignment/internal/bot"
	"github.com/se-take-home-assignment/internal/model"
)

func init() {
	// Speed up tests
	bot.ProcessDuration = 100 * time.Millisecond
}

func TestNewNormalOrder(t *testing.T) {
	var buf bytes.Buffer
	ctrl := New(&buf)

	ctrl.NewOrder(model.Normal)
	ctrl.NewOrder(model.Normal)

	pending := ctrl.PendingOrders()
	if len(pending) != 2 {
		t.Fatalf("expected 2 pending orders, got %d", len(pending))
	}
	// Order IDs should be unique and increasing
	if pending[0].ID >= pending[1].ID {
		t.Errorf("expected increasing IDs, got %d >= %d", pending[0].ID, pending[1].ID)
	}
}

func TestNewVIPOrderPriority(t *testing.T) {
	var buf bytes.Buffer
	ctrl := New(&buf)

	ctrl.NewOrder(model.Normal) // order A
	ctrl.NewOrder(model.Normal) // order B
	ctrl.NewOrder(model.VIP)    // order C - should be first in queue
	ctrl.NewOrder(model.Normal) // order D
	ctrl.NewOrder(model.VIP)    // order E - should be second in queue

	pending := ctrl.PendingOrders()
	if len(pending) != 5 {
		t.Fatalf("expected 5 pending orders, got %d", len(pending))
	}

	// VIP orders should be first, then Normal orders
	expectedTypes := []model.OrderType{model.VIP, model.VIP, model.Normal, model.Normal, model.Normal}
	for i, expectedType := range expectedTypes {
		if pending[i].Type != expectedType {
			t.Errorf("position %d: expected %s, got %s (ID=%d)", i, expectedType, pending[i].Type, pending[i].ID)
		}
	}
	// VIP C (3rd created) should be before VIP E (5th created)
	if pending[0].ID >= pending[1].ID {
		t.Errorf("VIP orders should maintain FIFO: first=%d, second=%d", pending[0].ID, pending[1].ID)
	}
}

func TestAddBotProcessesOrder(t *testing.T) {
	var buf bytes.Buffer
	ctrl := New(&buf)

	ctrl.NewOrder(model.Normal)
	ctrl.AddBot()

	// Bot should pick up the order
	time.Sleep(50 * time.Millisecond)
	pending := ctrl.PendingOrders()
	if len(pending) != 0 {
		t.Errorf("expected 0 pending orders, got %d", len(pending))
	}

	// Wait for processing to complete
	time.Sleep(150 * time.Millisecond)

	completed := ctrl.CompletedOrders()
	if len(completed) != 1 {
		t.Fatalf("expected 1 completed order, got %d", len(completed))
	}
	if completed[0].Type != model.Normal {
		t.Errorf("expected Normal order, got %s", completed[0].Type)
	}
}

func TestAddBotIdleWhenNoOrders(t *testing.T) {
	var buf bytes.Buffer
	ctrl := New(&buf)

	ctrl.AddBot()

	output := buf.String()
	if !strings.Contains(output, "idle") {
		t.Errorf("expected idle message, got: %s", output)
	}
}

func TestRemoveBotReturnsOrder(t *testing.T) {
	var buf bytes.Buffer
	ctrl := New(&buf)

	ctrl.NewOrder(model.Normal) // order A (Normal)
	ctrl.NewOrder(model.VIP)    // order B (VIP)
	ctrl.AddBot()               // Bot 1 processes order B (VIP first)

	time.Sleep(50 * time.Millisecond)

	// Remove the bot while processing
	ctrl.RemoveBot()

	// Both orders should be back in pending
	pending := ctrl.PendingOrders()
	if len(pending) != 2 {
		t.Fatalf("expected 2 pending orders, got %d", len(pending))
	}
	// VIP should be before Normal
	if pending[0].Type != model.VIP {
		t.Errorf("expected VIP first, got %s (ID=%d)", pending[0].Type, pending[0].ID)
	}
	if pending[1].Type != model.Normal {
		t.Errorf("expected Normal second, got %s (ID=%d)", pending[1].Type, pending[1].ID)
	}
}

func TestBotPicksUpNextOrder(t *testing.T) {
	var buf bytes.Buffer
	ctrl := New(&buf)

	ctrl.NewOrder(model.Normal) // order A
	ctrl.NewOrder(model.Normal) // order B
	ctrl.AddBot()               // Bot 1 processes order A

	// Wait for A to complete, B should start processing
	time.Sleep(250 * time.Millisecond)

	completed := ctrl.CompletedOrders()
	if len(completed) < 1 {
		t.Fatalf("expected at least 1 completed order, got %d", len(completed))
	}

	// Wait for B to complete
	time.Sleep(150 * time.Millisecond)

	completed = ctrl.CompletedOrders()
	if len(completed) != 2 {
		t.Fatalf("expected 2 completed orders, got %d", len(completed))
	}
	// First completed should have smaller ID (created earlier)
	if completed[0].ID >= completed[1].ID {
		t.Errorf("expected first completed to have smaller ID: %d >= %d", completed[0].ID, completed[1].ID)
	}
}

func TestNewOrderAssignedToIdleBot(t *testing.T) {
	var buf bytes.Buffer
	ctrl := New(&buf)

	ctrl.AddBot() // Bot 1, idle

	// Add order - should be immediately assigned to idle bot
	ctrl.NewOrder(model.Normal)

	time.Sleep(50 * time.Millisecond)
	pending := ctrl.PendingOrders()
	if len(pending) != 0 {
		t.Errorf("expected 0 pending (bot should be processing), got %d", len(pending))
	}

	// Wait for completion
	time.Sleep(150 * time.Millisecond)

	completed := ctrl.CompletedOrders()
	if len(completed) != 1 {
		t.Fatalf("expected 1 completed order, got %d", len(completed))
	}
}

func TestTimestampInOutput(t *testing.T) {
	var buf bytes.Buffer
	ctrl := New(&buf)

	ctrl.NewOrder(model.Normal)

	output := buf.String()
	// Check for HH:MM:SS pattern
	if !strings.Contains(output, "[") || !strings.Contains(output, "]") {
		t.Errorf("expected timestamp in output, got: %s", output)
	}
}

func TestRemoveNoBot(t *testing.T) {
	var buf bytes.Buffer
	ctrl := New(&buf)

	ctrl.RemoveBot()

	output := buf.String()
	if !strings.Contains(output, "No bots to remove") {
		t.Errorf("expected 'No bots to remove' message, got: %s", output)
	}
}

func TestBotIDWrapsAround(t *testing.T) {
	var buf bytes.Buffer
	ctrl := New(&buf)

	// Set nextBot near the limit
	ctrl.nextBot = MaxBotID
	ctrl.AddBot() // should get ID 32767

	// nextBot should have wrapped to 1
	if ctrl.nextBot != 1 {
		t.Errorf("expected nextBot to wrap to 1, got %d", ctrl.nextBot)
	}

	ctrl.AddBot() // should get ID 1
	if ctrl.nextBot != 2 {
		t.Errorf("expected nextBot to be 2 after wrap, got %d", ctrl.nextBot)
	}
}

func TestOrderIDFormat(t *testing.T) {
	var buf bytes.Buffer
	ctrl := New(&buf)

	ctrl.NewOrder(model.Normal)

	pending := ctrl.PendingOrders()
	if len(pending) != 1 {
		t.Fatalf("expected 1 order, got %d", len(pending))
	}

	// Order ID should be (timestamp << 16) | seq
	orderID := pending[0].ID
	if orderID <= 0 {
		t.Errorf("order ID should be positive, got %d", orderID)
	}
	// Sequence part (low 16 bits) should be 1
	seqPart := orderID & ((1 << orderSeqBits) - 1)
	if seqPart != 1 {
		t.Errorf("expected sequence part to be 1, got %d", seqPart)
	}
	// Timestamp part (high bits) should be reasonable
	tsPart := orderID >> orderSeqBits
	if tsPart <= 0 {
		t.Errorf("expected positive timestamp part, got %d", tsPart)
	}
}
