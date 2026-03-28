package application

import (
	"testing"

	"mcdonalds-order-controller/domain"
)

func TestBotService_AddBot(t *testing.T) {
	scheduler := domain.NewBotScheduler()
	service := NewBotService(scheduler)

	bot := service.AddBot()

	if bot == nil {
		t.Fatal("AddBot() returned nil")
	}

	if bot.ID == 0 {
		t.Error("Expected non-zero bot ID")
	}

	if bot.Status != domain.Idle {
		t.Errorf("Expected bot status Idle, got %v", bot.Status)
	}

	// Add another bot
	bot2 := service.AddBot()
	if bot2.ID <= bot.ID {
		t.Errorf("Expected bot2 ID (%d) > bot1 ID (%d)", bot2.ID, bot.ID)
	}
}

func TestBotService_RemoveBot(t *testing.T) {
	scheduler := domain.NewBotScheduler()
	service := NewBotService(scheduler)

	// Remove from empty scheduler
	bot, order := service.RemoveBot()
	if bot != nil || order != nil {
		t.Error("RemoveBot() should return nil when no bots exist")
	}

	// Add a bot
	addedBot := service.AddBot()

	// Remove the bot
	removedBot, order := service.RemoveBot()
	if removedBot == nil {
		t.Fatal("RemoveBot() returned nil bot")
	}

	if removedBot.ID != addedBot.ID {
		t.Errorf("Expected removed bot ID %d, got %d", addedBot.ID, removedBot.ID)
	}

	if order != nil {
		t.Error("Expected nil order when bot is idle")
	}
}

func TestBotService_RemoveBot_WithProcessingOrder(t *testing.T) {
	scheduler := domain.NewBotScheduler()
	service := NewBotService(scheduler)

	// Add a bot
	service.AddBot()

	// Submit an order to make the bot process it
	order := domain.NewOrder(1, domain.Normal)
	scheduler.SubmitOrder(order)

	// Remove bot while processing
	removedBot, returnedOrder := service.RemoveBot()

	if removedBot == nil {
		t.Fatal("RemoveBot() returned nil bot")
	}

	if returnedOrder == nil {
		t.Fatal("Expected returned order when removing processing bot")
	}

	if returnedOrder.ID != order.ID {
		t.Errorf("Expected returned order ID %d, got %d", order.ID, returnedOrder.ID)
	}

	if returnedOrder.Status != domain.OrderPending {
		t.Errorf("Expected returned order status Pending, got %v", returnedOrder.Status)
	}
}

func TestBotService_GetBotStatus(t *testing.T) {
	scheduler := domain.NewBotScheduler()
	service := NewBotService(scheduler)

	// Initially should be empty
	status := service.GetBotStatus()
	if len(status) != 0 {
		t.Errorf("Expected 0 bots initially, got %d", len(status))
	}

	// Add bots
	service.AddBot()
	service.AddBot()

	status = service.GetBotStatus()
	if len(status) != 2 {
		t.Errorf("Expected 2 bots, got %d", len(status))
	}

	// Check all bots are idle
	for id, s := range status {
		if s != "Idle" {
			t.Errorf("Expected bot %d status 'Idle', got '%s'", id, s)
		}
	}

	// Remove one bot
	service.RemoveBot()

	status = service.GetBotStatus()
	if len(status) != 1 {
		t.Errorf("Expected 1 bot after removal, got %d", len(status))
	}
}
