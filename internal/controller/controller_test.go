package controller

import (
	"bytes"
	"io"
	"strings"
	"testing"
	"time"
)

func TestVIPOrdersAreDispatchedBeforeNormalOrders(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	normal := c.NewOrder(Normal)
	vip := c.NewOrder(VIP)
	bot := c.AddBot()

	snapshot := c.Snapshot()
	if bot.CurrentOrderID != vip.ID {
		t.Fatalf("bot picked order %d, want VIP order %d", bot.CurrentOrderID, vip.ID)
	}
	if len(snapshot.Pending) != 1 || snapshot.Pending[0].ID != normal.ID {
		t.Fatalf("pending queue = %+v, want only normal order %d", snapshot.Pending, normal.ID)
	}
}

func TestPendingOrdersKeepVIPPriorityAndFIFO(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	normal1 := c.NewOrder(Normal)
	vip1 := c.NewOrder(VIP)
	normal2 := c.NewOrder(Normal)
	vip2 := c.NewOrder(VIP)

	snapshot := c.Snapshot()
	expected := []int{vip1.ID, vip2.ID, normal1.ID, normal2.ID}
	if len(snapshot.Pending) != len(expected) {
		t.Fatalf("pending = %+v, want %d orders", snapshot.Pending, len(expected))
	}
	for i, orderID := range expected {
		if snapshot.Pending[i].ID != orderID {
			t.Fatalf("pending[%d] = order %d, want order %d; pending = %+v", i, snapshot.Pending[i].ID, orderID, snapshot.Pending)
		}
	}
}

func TestRemovingProcessingBotReturnsOrderToPriorityQueue(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	normal := c.NewOrder(Normal)
	c.AddBot()
	vip := c.NewOrder(VIP)

	removed := c.RemoveBot()
	if removed == nil {
		t.Fatal("expected a bot to be removed")
	}

	snapshot := c.Snapshot()
	if len(snapshot.Bots) != 0 {
		t.Fatalf("bots = %+v, want no active bots", snapshot.Bots)
	}
	if len(snapshot.Pending) != 2 {
		t.Fatalf("pending count = %d, want 2", len(snapshot.Pending))
	}
	if snapshot.Pending[0].ID != vip.ID || snapshot.Pending[1].ID != normal.ID {
		t.Fatalf("pending order = %+v, want VIP %d before returned normal %d", snapshot.Pending, vip.ID, normal.ID)
	}
}

func TestRemoveBotRemovesNewestBot(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	first := c.AddBot()
	second := c.AddBot()

	removed := c.RemoveBot()
	if removed == nil || removed.ID != second.ID {
		t.Fatalf("removed bot = %+v, want newest bot %d", removed, second.ID)
	}

	snapshot := c.Snapshot()
	if len(snapshot.Bots) != 1 || snapshot.Bots[0].ID != first.ID {
		t.Fatalf("bots = %+v, want only bot %d remaining", snapshot.Bots, first.ID)
	}
}

func TestCompletionCommandFromRemovedBotIsIgnored(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	order := c.NewOrder(Normal)
	c.AddBot()
	c.RemoveBot()
	sendComplete(c, 1, order.ID)

	snapshot := c.Snapshot()
	if len(snapshot.Completed) != 0 {
		t.Fatalf("completed = %+v, want no completed orders after removed bot timer fires", snapshot.Completed)
	}
	if len(snapshot.Pending) != 1 || snapshot.Pending[0].ID != order.ID {
		t.Fatalf("pending = %+v, want returned order %d", snapshot.Pending, order.ID)
	}
}

func TestBotCompletesOrderAndContinuesWithNextPriorityOrder(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	normal := c.NewOrder(Normal)
	vip := c.NewOrder(VIP)
	c.AddBot()

	sendComplete(c, 1, vip.ID)
	sendComplete(c, 1, normal.ID)

	snapshot := c.Snapshot()
	if len(snapshot.Completed) != 2 {
		t.Fatalf("completed count = %d, want 2", len(snapshot.Completed))
	}
	if snapshot.Completed[0].ID != vip.ID || snapshot.Completed[1].ID != normal.ID {
		t.Fatalf("completed = %+v, want VIP %d then normal %d", snapshot.Completed, vip.ID, normal.ID)
	}
	if len(snapshot.Pending) != 0 {
		t.Fatalf("pending = %+v, want empty", snapshot.Pending)
	}
	if len(snapshot.Bots) != 1 || snapshot.Bots[0].Status != BotIdle {
		t.Fatalf("bots = %+v, want one idle bot", snapshot.Bots)
	}
}

func TestCompletedChannelReceivesCompletedOrders(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	order := c.NewOrder(Normal)
	c.AddBot()
	sendComplete(c, 1, order.ID)

	select {
	case completed := <-c.Completed():
		if completed.ID != order.ID {
			t.Fatalf("completed order ID = %d, want %d", completed.ID, order.ID)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for completed order event")
	}
}

func TestBotIsNotLoggedIdleWhenItImmediatelyReceivesAnotherOrder(t *testing.T) {
	var log bytes.Buffer
	c := NewController(&log)
	defer c.Stop()

	normal := c.NewOrder(Normal)
	vip := c.NewOrder(VIP)
	c.AddBot()

	sendComplete(c, 1, vip.ID)

	snapshot := c.Snapshot()
	if len(snapshot.Bots) != 1 || snapshot.Bots[0].Status != BotProcessing || snapshot.Bots[0].CurrentOrderID != normal.ID {
		t.Fatalf("bot state = %+v, want processing normal order %d", snapshot.Bots, normal.ID)
	}
	if strings.Contains(log.String(), "Bot #1 is now IDLE") {
		t.Fatalf("bot was logged idle while it had another order; logs:\n%s", log.String())
	}
}

func sendComplete(c *Controller, botID, orderID int) {
	c.commands <- command{kind: cmdCompleteOrder, botID: botID, orderID: orderID}
}
