package order

import (
	"bytes"
	"strings"
	"testing"
	"time"
)

func TestVIPOrdersAreProcessedBeforeNormalOrders(t *testing.T) {
	var out bytes.Buffer
	controller := NewController(NewEventLogger(&out), 20*time.Millisecond)
	defer controller.Shutdown()

	controller.CreateOrder(NormalOrder)
	controller.CreateOrder(VIPOrder)
	controller.CreateOrder(NormalOrder)
	controller.AddBot()

	waitFor(t, 2*time.Second, func() bool {
		s := controller.Snapshot()
		return s.VIPCompleted+s.NormCompleted == 3
	})

	log := out.String()
	vipPickup := strings.Index(log, "picked up VIP Order #1002")
	normalPickup := strings.Index(log, "picked up Normal Order #1001")
	if vipPickup == -1 || normalPickup == -1 {
		t.Fatalf("expected VIP and Normal pickup logs, got:\n%s", log)
	}
	if vipPickup > normalPickup {
		t.Fatalf("VIP order should be picked before normal order, got:\n%s", log)
	}
}

func TestRemovingProcessingBotReturnsOrderToPending(t *testing.T) {
	var out bytes.Buffer
	controller := NewController(NewEventLogger(&out), 500*time.Millisecond)
	defer controller.Shutdown()

	controller.CreateOrder(NormalOrder)
	controller.AddBot()
	waitFor(t, time.Second, func() bool {
		s := controller.Snapshot()
		return len(s.Processing) == 1 && len(s.Pending) == 0
	})

	if _, err := controller.RemoveNewestBot(); err != nil {
		t.Fatalf("remove bot: %v", err)
	}
	waitFor(t, time.Second, func() bool {
		s := controller.Snapshot()
		return len(s.Pending) == 1 && s.Pending[0].Status == PendingStatus
	})

	controller.AddBot()
	waitFor(t, 2*time.Second, func() bool {
		s := controller.Snapshot()
		return s.VIPCompleted+s.NormCompleted == 1
	})
}

func waitFor(t *testing.T, timeout time.Duration, condition func() bool) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if condition() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("condition was not met before timeout")
}
