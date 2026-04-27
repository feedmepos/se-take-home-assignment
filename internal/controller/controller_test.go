package controller

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/feedmepos/order-controller/internal/output"
)

const testProcTime = 50 * time.Millisecond

func newTestController() (*Controller, *output.Logger) {
	logger := output.NewLogger(&bytes.Buffer{})
	return New(logger, testProcTime), logger
}

func TestNormalOrderPending(t *testing.T) {
	c, logger := newTestController()
	c.AddOrder(false)
	if !strings.Contains(logger.Snapshot(), "Normal Order #1 → PENDING") {
		t.Fatalf("unexpected output: %s", logger.Snapshot())
	}
}

func TestVIPOrderPending(t *testing.T) {
	c, logger := newTestController()
	c.AddOrder(true)
	if !strings.Contains(logger.Snapshot(), "VIP Order #1 → PENDING") {
		t.Fatalf("unexpected output: %s", logger.Snapshot())
	}
}

func TestOrderIDIncreasing(t *testing.T) {
	c, logger := newTestController()
	c.AddOrder(false)
	c.AddOrder(true)
	c.AddOrder(false)
	out := logger.Snapshot()
	if !strings.Contains(out, "Order #1") || !strings.Contains(out, "Order #2") || !strings.Contains(out, "Order #3") {
		t.Fatalf("order IDs not sequential: %s", out)
	}
}

func TestBotProcessesOrder(t *testing.T) {
	c, logger := newTestController()
	c.AddOrder(false)
	c.AddBot()

	time.Sleep(testProcTime + 30*time.Millisecond)

	out := logger.Snapshot()
	if !strings.Contains(out, "→ PROCESSING") {
		t.Fatalf("expected PROCESSING in output: %s", out)
	}
	if !strings.Contains(out, "→ COMPLETE") {
		t.Fatalf("expected COMPLETE in output: %s", out)
	}
}

func TestVIPProcessedBeforeNormal(t *testing.T) {
	c, logger := newTestController()
	c.AddOrder(false) // Normal #1
	c.AddOrder(true)  // VIP #2
	c.AddOrder(false) // Normal #3
	c.AddBot()

	time.Sleep(testProcTime + 30*time.Millisecond)

	out := logger.Snapshot()
	vipIdx := strings.Index(out, "VIP Order #2 → PROCESSING")
	normIdx := strings.Index(out, "Normal Order #1 → PROCESSING")
	if vipIdx == -1 || normIdx == -1 {
		t.Fatalf("missing expected log lines: %s", out)
	}
	if vipIdx > normIdx {
		t.Fatalf("VIP should be processed before Normal: %s", out)
	}
}

func TestRemoveBotRequeuesOrder(t *testing.T) {
	c, _ := newTestController()
	c.AddOrder(false)
	c.AddBot()

	time.Sleep(5 * time.Millisecond)
	c.RemoveBot()

	status := c.Status()
	if !strings.Contains(status, "pending=1") {
		t.Fatalf("order should be pending after bot removed: %s", status)
	}
	if !strings.Contains(status, "bots=0") {
		t.Fatalf("should have 0 bots after removal: %s", status)
	}
	if !strings.Contains(status, "processing=0") {
		t.Fatalf("should have 0 processing after removal: %s", status)
	}
}

func TestRemoveBotLIFO(t *testing.T) {
	c, logger := newTestController()
	c.AddBot()
	c.AddBot()
	c.AddBot()
	c.RemoveBot()

	out := logger.Snapshot()
	if !strings.Contains(out, "Bot #3 destroyed") {
		t.Fatalf("expected newest bot (Bot#3) to be removed: %s", out)
	}
}

func TestIdleBotPicksUpNewOrder(t *testing.T) {
	c, logger := newTestController()
	c.AddBot()

	time.Sleep(10 * time.Millisecond)
	c.AddOrder(false)

	time.Sleep(testProcTime + 30*time.Millisecond)

	out := logger.Snapshot()
	if !strings.Contains(out, "→ COMPLETE") {
		t.Fatalf("idle bot should pick up and complete the new order: %s", out)
	}
}

func TestRemoveNonExistentBot(t *testing.T) {
	c, _ := newTestController()
	c.RemoveBot() // should not panic
}
