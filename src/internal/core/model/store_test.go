package model

import (
	"testing"
	"time"
)

func TestStoreCreateOrderUsesExpectedStartingIDAndSequence(t *testing.T) {
	store := NewStore()

	firstOrder := store.CreateOrder(PriorityNormal)
	secondOrder := store.CreateOrder(PriorityVIP)

	if got, want := firstOrder.ID(), 10000001; got != want {
		t.Fatalf("first order id = %d, want %d", got, want)
	}
	if got, want := secondOrder.ID(), 10000002; got != want {
		t.Fatalf("second order id = %d, want %d", got, want)
	}
	if got := firstOrder.Status(); got != OrderStatusPending {
		t.Fatalf("first order status = %s, want %s", got, OrderStatusPending)
	}
	if got := secondOrder.Priority(); got != PriorityVIP {
		t.Fatalf("second order priority = %s, want %s", got, PriorityVIP)
	}
	if got, want := len(store.Orders()), 2; got != want {
		t.Fatalf("orders len = %d, want %d", got, want)
	}
}

func TestStoreCreateBotLastBotAndRemoveLastBot(t *testing.T) {
	store := NewStore()

	firstBot := store.CreateBot(10 * time.Second)
	secondBot := store.CreateBot(15 * time.Second)

	if got, want := firstBot.ID(), 1001; got != want {
		t.Fatalf("first bot id = %d, want %d", got, want)
	}
	if got, want := secondBot.ID(), 1002; got != want {
		t.Fatalf("second bot id = %d, want %d", got, want)
	}
	if got := secondBot.ProcessDuration(); got != 15*time.Second {
		t.Fatalf("second bot duration = %s, want %s", got, 15*time.Second)
	}

	lastBot, ok := store.LastBot()
	if !ok || lastBot.ID() != 1002 {
		t.Fatalf("LastBot() = %v, %v, want bot 1002 and ok=true", lastBot, ok)
	}

	removedBot, ok := store.RemoveLastBot()
	if !ok || removedBot.ID() != 1002 {
		t.Fatalf("RemoveLastBot() = %v, %v, want bot 1002 and ok=true", removedBot, ok)
	}

	lastBot, ok = store.LastBot()
	if !ok || lastBot.ID() != 1001 {
		t.Fatalf("LastBot() after remove = %v, %v, want bot 1001 and ok=true", lastBot, ok)
	}
	if got, want := len(store.Bots()), 1; got != want {
		t.Fatalf("bots len after remove = %d, want %d", got, want)
	}
}

func TestStoreLastBotAndRemoveLastBotOnEmptyStore(t *testing.T) {
	store := NewStore()

	lastBot, ok := store.LastBot()
	if ok || lastBot != nil {
		t.Fatalf("LastBot() on empty store = %v, %v, want nil, false", lastBot, ok)
	}

	removedBot, ok := store.RemoveLastBot()
	if ok || removedBot != nil {
		t.Fatalf("RemoveLastBot() on empty store = %v, %v, want nil, false", removedBot, ok)
	}
}
