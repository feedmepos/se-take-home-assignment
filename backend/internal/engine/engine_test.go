package engine

import (
	"testing"
	"time"

	"github.com/feedme/order-controller/internal/core"
)

func TestAddOrder(t *testing.T) {
	e := New(10 * time.Millisecond) // fast processing for tests
	e.AddOrder(core.Normal)
	state := e.State()
	if len(state.PendingOrders) != 1 {
		t.Errorf("expected 1 pending order, got %d", len(state.PendingOrders))
	}
}

func TestAddBotPicksUpOrder(t *testing.T) {
	e := New(10 * time.Millisecond)
	e.AddOrder(core.Normal)
	e.AddBot()
	time.Sleep(5 * time.Millisecond) // let bot pick up
	state := e.State()
	if len(state.Bots) != 1 {
		t.Fatalf("expected 1 bot, got %d", len(state.Bots))
	}
	if state.Bots[0].Status != core.BotProcessing {
		t.Errorf("expected bot processing, got %v", state.Bots[0].Status)
	}
}

func TestBotCompletesOrder(t *testing.T) {
	e := New(50 * time.Millisecond)
	e.AddOrder(core.Normal)
	e.AddBot()
	time.Sleep(100 * time.Millisecond) // wait for processing
	state := e.State()
	if len(state.CompletedOrders) != 1 {
		t.Errorf("expected 1 completed, got %d", len(state.CompletedOrders))
	}
}

func TestVIPPriorityInEngine(t *testing.T) {
	e := New(50 * time.Millisecond)
	e.AddOrder(core.Normal) // #1
	e.AddOrder(core.Normal) // #2
	e.AddOrder(core.VIP)    // #3
	e.AddBot()
	time.Sleep(10 * time.Millisecond) // let bot pick up
	state := e.State()
	// Bot should pick up VIP #3 first
	if state.Bots[0].Order == nil || state.Bots[0].Order.ID != 3 {
		t.Errorf("expected bot to pick up VIP order #3")
	}
}

func TestRemoveBotReturnsOrder(t *testing.T) {
	e := New(5 * time.Second) // long processing so bot is still busy
	e.AddOrder(core.Normal)
	e.AddBot()
	time.Sleep(10 * time.Millisecond) // let bot pick up
	e.RemoveBot()
	state := e.State()
	if len(state.Bots) != 0 {
		t.Errorf("expected 0 bots, got %d", len(state.Bots))
	}
	if len(state.PendingOrders) != 1 {
		t.Errorf("expected 1 pending (returned), got %d", len(state.PendingOrders))
	}
}

func TestRemoveNewestBot(t *testing.T) {
	e := New(5 * time.Second)
	e.AddBot() // #1
	e.AddBot() // #2
	e.RemoveBot()
	state := e.State()
	if len(state.Bots) != 1 {
		t.Fatalf("expected 1 bot, got %d", len(state.Bots))
	}
	if state.Bots[0].ID != 1 {
		t.Errorf("expected bot #1 to remain, got #%d", state.Bots[0].ID)
	}
}

func TestIdleBotPicksUpNewOrder(t *testing.T) {
	e := New(50 * time.Millisecond)
	e.AddBot()
	time.Sleep(5 * time.Millisecond) // bot is idle
	e.AddOrder(core.Normal)
	time.Sleep(10 * time.Millisecond) // let bot pick up
	state := e.State()
	if state.Bots[0].Status != core.BotProcessing {
		t.Errorf("expected idle bot to pick up order")
	}
}
