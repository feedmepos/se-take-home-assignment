package domain

import (
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestVIPPriorityOverNormal(t *testing.T) {
	c := NewController(500*time.Millisecond, nil)

	normal := c.NewNormalOrder()
	vip := c.NewVIPOrder()

	s := c.Snapshot()
	if len(s.PendingVIPIDs) != 1 || s.PendingVIPIDs[0] != vip.ID {
		t.Fatalf("expected VIP pending first, got %+v", s.PendingVIPIDs)
	}
	if len(s.PendingNormalIDs) != 1 || s.PendingNormalIDs[0] != normal.ID {
		t.Fatalf("expected normal pending list to keep normal order, got %+v", s.PendingNormalIDs)
	}
}

func TestOrderIDIsIncreasing(t *testing.T) {
	c := NewController(500*time.Millisecond, nil)
	o1 := c.NewNormalOrder()
	o2 := c.NewVIPOrder()
	o3 := c.NewNormalOrder()
	if !(o1.ID < o2.ID && o2.ID < o3.ID) {
		t.Fatalf("expected increasing ids, got %d, %d, %d", o1.ID, o2.ID, o3.ID)
	}
}

func TestBotProcessesOrderToComplete(t *testing.T) {
	c := NewController(50*time.Millisecond, nil)
	c.AddBot()
	c.NewNormalOrder()
	time.Sleep(100 * time.Millisecond)

	s := c.Snapshot()
	if len(s.CompletedOrderIDs) != 1 {
		t.Fatalf("expected one completed order, got %+v", s.CompletedOrderIDs)
	}
}

func TestRemoveBusyBotRequeuesOrder(t *testing.T) {
	c := NewController(300*time.Millisecond, nil)
	c.AddBot()
	o := c.NewNormalOrder()
	time.Sleep(20 * time.Millisecond)

	if err := c.RemoveLatestBot(); err != nil {
		t.Fatalf("unexpected error removing bot: %v", err)
	}

	s := c.Snapshot()
	if len(s.PendingNormalIDs) != 1 || s.PendingNormalIDs[0] != o.ID {
		t.Fatalf("expected order to be re-queued, got pending=%+v", s.PendingNormalIDs)
	}
	if len(s.CompletedOrderIDs) != 0 {
		t.Fatalf("expected no completed order after cancellation, got %+v", s.CompletedOrderIDs)
	}
}

func TestVIPStableFIFO(t *testing.T) {
	c := NewController(500*time.Millisecond, nil)
	v1 := c.NewVIPOrder()
	v2 := c.NewVIPOrder()

	s := c.Snapshot()
	if s.PendingVIPIDs[0] != v1.ID || s.PendingVIPIDs[1] != v2.ID {
		t.Fatalf("VIP orders should maintain FIFO among themselves")
	}
}

func TestConcurrency(t *testing.T) {
	c := NewController(10*time.Millisecond, nil)
	c.AddBot()

	const count = 100
	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		for i := 0; i < count; i++ {
			c.NewNormalOrder()
			c.NewVIPOrder()
		}
	}()

	go func() {
		defer wg.Done()
		for i := 0; i < 10; i++ {
			c.AddBot()
			time.Sleep(5 * time.Millisecond)
			_ = c.RemoveLatestBot()
		}
	}()

	wg.Wait()
	time.Sleep(500 * time.Millisecond)

	s := c.Snapshot()
	seen := map[int]bool{}
	duplicate := func(id int) {
		if seen[id] {
			t.Fatalf("duplicate order id found across snapshot views: %d", id)
		}
		seen[id] = true
	}

	for _, id := range s.PendingVIPIDs {
		duplicate(id)
	}
	for _, id := range s.PendingNormalIDs {
		duplicate(id)
	}
	for _, id := range s.CompletedOrderIDs {
		duplicate(id)
	}
	for _, summary := range s.BotSummaries {
		var id int
		if _, err := fmt.Sscanf(summary, "bot#%*d(%*s order#%d)", &id); err == nil {
			duplicate(id)
		}
	}
}

func TestRequeuedOrderPriority(t *testing.T) {
	c := NewController(200*time.Millisecond, nil)
	c.AddBot()
	oNormal := c.NewNormalOrder()
	time.Sleep(50 * time.Millisecond)

	c.RemoveLatestBot()
	oVIP := c.NewVIPOrder()

	s := c.Snapshot()
	if len(s.PendingVIPIDs) == 0 || len(s.PendingNormalIDs) == 0 {
		t.Fatalf("expected both VIP and Normal pending queues to be non-empty, got VIP=%v Normal=%v", s.PendingVIPIDs, s.PendingNormalIDs)
	}
	if s.PendingVIPIDs[0] != oVIP.ID || s.PendingNormalIDs[0] != oNormal.ID {
		t.Errorf("VIP should still be prioritized over re-queued Normal order")
	}
}

func TestNormalStableFIFO(t *testing.T) {
	c := NewController(500*time.Millisecond, nil)
	n1 := c.NewNormalOrder()
	n2 := c.NewNormalOrder()

	s := c.Snapshot()
	if len(s.PendingNormalIDs) != 2 {
		t.Fatalf("expected two normal orders pending, got %v", s.PendingNormalIDs)
	}
	if s.PendingNormalIDs[0] != n1.ID || s.PendingNormalIDs[1] != n2.ID {
		t.Fatalf("normal orders should maintain FIFO among themselves")
	}
}

func TestRemoveLatestBotReturnsErrorWhenNoBot(t *testing.T) {
	c := NewController(200*time.Millisecond, nil)
	if err := c.RemoveLatestBot(); err == nil {
		t.Fatalf("expected error when removing bot from empty pool")
	}
}

func TestRemoveLatestBotUsesLIFOOrder(t *testing.T) {
	c := NewController(200*time.Millisecond, nil)
	c.AddBot()
	c.AddBot()

	if err := c.RemoveLatestBot(); err != nil {
		t.Fatalf("unexpected error removing latest bot: %v", err)
	}

	s := c.Snapshot()
	if len(s.BotSummaries) != 1 {
		t.Fatalf("expected one bot left, got %v", s.BotSummaries)
	}
	if !strings.HasPrefix(s.BotSummaries[0], "bot#1(") {
		t.Fatalf("expected bot#1 to remain after LIFO removal, got %v", s.BotSummaries)
	}
}

func TestRemoveIdleBotDoesNotAffectPendingOrCompleted(t *testing.T) {
	c := NewController(200*time.Millisecond, nil)
	c.AddBot()
	o := c.NewNormalOrder()
	time.Sleep(220 * time.Millisecond)
	c.AddBot()

	before := c.Snapshot()
	if err := c.RemoveLatestBot(); err != nil {
		t.Fatalf("unexpected error removing idle bot: %v", err)
	}
	after := c.Snapshot()

	if len(after.CompletedOrderIDs) != len(before.CompletedOrderIDs) {
		t.Fatalf("removing idle bot should not change completed list, before=%v after=%v", before.CompletedOrderIDs, after.CompletedOrderIDs)
	}
	if len(after.PendingVIPIDs) != 0 || len(after.PendingNormalIDs) != 0 {
		t.Fatalf("expected no pending orders, got VIP=%v Normal=%v", after.PendingVIPIDs, after.PendingNormalIDs)
	}
	if len(after.BotSummaries) != 1 || !strings.HasPrefix(after.BotSummaries[0], "bot#1(") {
		t.Fatalf("expected only bot#1 to remain, got %v", after.BotSummaries)
	}
	if len(after.CompletedOrderIDs) != 1 || after.CompletedOrderIDs[0] != o.ID {
		t.Fatalf("expected completed order to stay unchanged, got %v", after.CompletedOrderIDs)
	}
}

func TestRemoveNearCompletionNeverLeavesOrderInBothStates(t *testing.T) {
	c := NewController(120*time.Millisecond, nil)
	c.AddBot()
	o := c.NewNormalOrder()
	time.Sleep(110 * time.Millisecond)
	_ = c.RemoveLatestBot()
	time.Sleep(40 * time.Millisecond)

	s := c.Snapshot()
	inPending := false
	for _, id := range s.PendingNormalIDs {
		if id == o.ID {
			inPending = true
		}
	}
	inCompleted := false
	for _, id := range s.CompletedOrderIDs {
		if id == o.ID {
			inCompleted = true
		}
	}
	if inPending && inCompleted {
		t.Fatalf("order %d should not be both pending and completed", o.ID)
	}
}
