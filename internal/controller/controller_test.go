package controller

import (
	"strings"
	"testing"
	"time"
)

func fixedTime() time.Time {
	return time.Date(2026, 6, 12, 14, 32, 1, 0, time.UTC)
}

func TestVIPOrdersAreQueuedBeforeNormalOrders(t *testing.T) {
	c := New()
	now := fixedTime()

	c.AddOrder(Normal, now)
	c.AddOrder(Normal, now)
	c.AddOrder(VIP, now)
	c.AddOrder(VIP, now)

	got := c.Snapshot().Pending
	wantIDs := []int{1003, 1004, 1001, 1002}
	if len(got) != len(wantIDs) {
		t.Fatalf("pending count = %d, want %d", len(got), len(wantIDs))
	}
	for i, want := range wantIDs {
		if got[i].ID != want {
			t.Fatalf("pending[%d] = #%d, want #%d", i, got[i].ID, want)
		}
	}
}

func TestBotCompletesOrderAfterProcessDurationAndContinues(t *testing.T) {
	c := NewWithProcessTime(10 * time.Second)
	now := fixedTime()

	c.AddOrder(Normal, now)
	c.AddOrder(Normal, now)
	c.AddBot(now)
	c.AdvanceTo(now.Add(10 * time.Second))

	s := c.Snapshot()
	if len(s.Completed) != 1 || s.Completed[0].ID != 1001 {
		t.Fatalf("completed = %+v, want only order #1001", s.Completed)
	}
	if len(s.Pending) != 0 {
		t.Fatalf("pending count = %d, want 0 because bot should pick the next order", len(s.Pending))
	}
	if len(s.Bots) != 1 || s.Bots[0].OrderID != 1002 {
		t.Fatalf("bot state = %+v, want processing order #1002", s.Bots)
	}
}

func TestRemovingBusyNewestBotReturnsOrderToPriorityPosition(t *testing.T) {
	c := New()
	now := fixedTime()

	c.AddOrder(Normal, now) // #1001
	c.AddBot(now)           // newest bot processes #1001
	c.AddOrder(Normal, now)
	c.AddOrder(VIP, now)
	c.RemoveNewestBot(now)

	got := c.Snapshot().Pending
	wantIDs := []int{1003, 1001, 1002}
	if len(got) != len(wantIDs) {
		t.Fatalf("pending count = %d, want %d", len(got), len(wantIDs))
	}
	for i, want := range wantIDs {
		if got[i].ID != want {
			t.Fatalf("pending[%d] = #%d, want #%d", i, got[i].ID, want)
		}
	}
}

func TestResultEventsContainHHMMSSTimestamps(t *testing.T) {
	c := New()
	now := fixedTime()

	c.Init(now)
	c.AddOrder(VIP, now)

	events := strings.Join(c.Events(), "\n")
	if !strings.Contains(events, "[14:32:01]") {
		t.Fatalf("events = %q, want HH:MM:SS timestamp", events)
	}
}
