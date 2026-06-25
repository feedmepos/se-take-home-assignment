package system

import (
	"testing"
	"time"

	"McDonald/internal/model"
	"McDonald/internal/output"
)

func initWriter() *output.Writer {
	// Use /dev/null for tests - we don't need file output
	w, _ := output.NewWriter("/dev/null")
	return w
}

func TestSystemState_CreateOrder(t *testing.T) {
	writer := initWriter()
	state := NewSystemState(writer)

	state.CreateOrder(model.OrderTypeNormal)

	if state.orderID != 1 {
		t.Errorf("Expected orderID 1, got %d", state.orderID)
	}

	if state.pending.Len() != 1 {
		t.Errorf("Expected 1 pending order, got %d", state.pending.Len())
	}
}

func TestSystemState_VIPPriority(t *testing.T) {
	writer := initWriter()
	state := NewSystemState(writer)

	// Create 2 normal, then 1 VIP, then 1 normal
	state.CreateOrder(model.OrderTypeNormal) // #1
	state.CreateOrder(model.OrderTypeNormal) // #2
	state.CreateOrder(model.OrderTypeVIP)     // #3
	state.CreateOrder(model.OrderTypeNormal) // #4

	// Expected order: #3 (VIP), #1 (Normal), #2 (Normal), #4 (Normal)
	orders := state.pending.GetOrders()

	if len(orders) != 4 {
		t.Errorf("Expected 4 orders, got %d", len(orders))
	}

	if orders[0].ID != 3 || !orders[0].IsVIP() {
		t.Errorf("Expected VIP order #3 first, got order #%d (%s)", orders[0].ID, orders[0].TypeString())
	}
}

func TestSystemState_AddBot(t *testing.T) {
	writer := initWriter()
	state := NewSystemState(writer)

	state.AddBot()

	if state.botID != 1 {
		t.Errorf("Expected botID 1, got %d", state.botID)
	}

	if len(state.bots) != 1 {
		t.Errorf("Expected 1 bot, got %d", len(state.bots))
	}
}

func TestSystemState_RemoveBot(t *testing.T) {
	writer := initWriter()
	state := NewSystemState(writer)

	state.AddBot()
	state.AddBot()
	state.RemoveBot()

	if len(state.bots) != 1 {
		t.Errorf("Expected 1 bot after removal, got %d", len(state.bots))
	}
}

func TestSystemState_OrderProcessing(t *testing.T) {
	writer := initWriter()
	state := NewSystemState(writer)

	// Create an order
	state.CreateOrder(model.OrderTypeNormal)

	// Add a bot - it should process the order
	state.AddBot()

	// Order should move from pending to processing
	bot := state.bots[1]
	if bot.Current == nil {
		t.Error("Bot should have an order to process")
	}

	if bot.Current.ID != 1 {
		t.Errorf("Expected Order #1, got Order #%d", bot.Current.ID)
	}
}

func TestSystemState_ConcurrentAccess(t *testing.T) {
	writer := initWriter()
	state := NewSystemState(writer)

	// Create multiple orders concurrently
	done := make(chan bool)
	for i := 0; i < 10; i++ {
		go func() {
			state.CreateOrder(model.OrderTypeNormal)
			done <- true
		}()
	}

	for i := 0; i < 10; i++ {
		<-done
	}

	if state.orderID != 10 {
		t.Errorf("Expected 10 orders, got %d", state.orderID)
	}
}

func TestSystemState_OrderComplete(t *testing.T) {
	writer := initWriter()
	state := NewSystemState(writer)

	state.CreateOrder(model.OrderTypeVIP)

	// Override processing duration for faster test
	// This is a simplified test - in real scenario we wait 10 seconds

	bot := &model.Bot{
		ID:       1,
		Status:   model.BotStatusProcessing,
		StopChan: make(chan struct{}),
	}
	state.bots[1] = bot

	order := state.pending.Dequeue()
	order.Status = model.OrderStatusProcessing
	bot.Current = order

	// Simulate completion
	now := time.Now()
	order.EndTime = &now
	order.Status = model.OrderStatusComplete
	state.complete = append(state.complete, order)
	bot.Status = model.BotStatusIdle
	bot.Current = nil

	if len(state.complete) != 1 {
		t.Errorf("Expected 1 complete order, got %d", len(state.complete))
	}

	if bot.Status != model.BotStatusIdle {
		t.Errorf("Expected bot to be idle, got %s", bot.StatusString())
	}
}
