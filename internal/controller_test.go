package internal

import (
	"fmt"
	"sync"
	"testing"
	"time"
)

var noop Logger = func(string, ...any) {}

func TestController_AddOrder_QueuePriority(t *testing.T) {
	c, _ := newTestController(noop, time.Hour) // no bots → orders stay in queue

	c.AddOrder(Normal) // #1
	c.AddOrder(VIP)    // #2 → goes before Normal
	c.AddOrder(Normal) // #3
	c.AddOrder(VIP)    // #4 → goes behind VIP#2 but before Normals

	ids := c.PeekPendingIDs()
	expected := []int{2, 4, 1, 3}

	if len(ids) != len(expected) {
		t.Fatalf("expected %d pending, got %d", len(expected), len(ids))
	}
	for i, id := range expected {
		if ids[i] != id {
			t.Errorf("position %d: expected order #%d, got #%d", i, id, ids[i])
		}
	}
}

func TestController_BotProcessesOrder(t *testing.T) {
	c, done := newTestController(noop, 50*time.Millisecond)

	c.AddOrder(Normal) // #1
	c.AddBot()         // picks up #1

	<-done // wait for completion instead of time.Sleep

	if c.PendingCount() != 0 {
		t.Errorf("expected empty queue, got %d pending", c.PendingCount())
	}
	if c.BotCount() != 1 || c.botStatusAt(0) != Idle {
		t.Error("expected bot to be IDLE after processing")
	}
}

func TestController_IdleBotPicksUpNewOrder(t *testing.T) {
	c, _ := newTestController(noop, time.Hour)

	c.AddBot() // IDLE — no orders yet

	if c.botStatusAt(0) != Idle {
		t.Error("expected bot to be IDLE")
	}

	c.AddOrder(Normal) // IDLE bot picks this up synchronously

	if c.botStatusAt(0) != Busy {
		t.Error("expected bot to be PROCESSING after new order arrived")
	}
}

func TestController_RemoveBot_ReturnsOrderToPending(t *testing.T) {
	c, _ := newTestController(noop, time.Hour)

	c.AddOrder(Normal) // #1
	c.AddBot()         // picks up #1

	c.RemoveBot() // order should return to PENDING

	if c.PendingCount() != 1 {
		t.Errorf("expected 1 pending order after bot removal, got %d", c.PendingCount())
	}
	if c.BotCount() != 0 {
		t.Error("expected no bots after removal")
	}
}

func TestController_RemoveBot_NewestFirst(t *testing.T) {
	c, _ := newTestController(noop, time.Hour)

	c.AddOrder(Normal) // #1
	c.AddOrder(Normal) // #2
	bot1 := c.AddBot() // picks up #1
	c.AddBot()         // picks up #2

	c.RemoveBot() // removes bot2 (highest ID)

	ids := c.BotIDs()
	if len(ids) != 1 || ids[0] != bot1.ID {
		t.Errorf("expected bot#%d to remain, got IDs: %v", bot1.ID, ids)
	}
}

func TestController_RemoveBot_NoBots(t *testing.T) {
	var logs []string
	log := func(format string, args ...any) {
		logs = append(logs, fmt.Sprintf(format, args...))
	}
	c, _ := newTestController(log, time.Hour)

	c.RemoveBot() // should not panic, should log

	if len(logs) != 1 || logs[0] != "No bots to remove" {
		t.Errorf("expected 'No bots to remove' log, got %v", logs)
	}
}

func TestController_ConcurrentAccess(t *testing.T) {
	c, done := newTestController(noop, 10*time.Millisecond)

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(2)
		go func() {
			defer wg.Done()
			c.AddOrder(Normal)
		}()
		go func() {
			defer wg.Done()
			c.AddBot()
		}()
	}
	wg.Wait()

	// Drain completions with timeout
	timeout := time.After(5 * time.Second)
	completed := 0
	for completed < 10 {
		select {
		case <-done:
			completed++
		case <-timeout:
			t.Fatalf("timed out waiting for completions, got %d", completed)
		}
	}

	c.Wait()
	c.Status()
}

func TestController_Wait(t *testing.T) {
	c, done := newTestController(noop, 50*time.Millisecond)

	c.AddOrder(Normal)
	c.AddOrder(VIP)
	c.AddBot()

	<-done // first order completes
	<-done // second order completes

	c.Wait() // should return immediately since all goroutines finished

	if c.PendingCount() != 0 {
		t.Errorf("expected 0 pending, got %d", c.PendingCount())
	}
}
