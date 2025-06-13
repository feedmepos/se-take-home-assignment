package service

import (
	"context"
	"testing"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/errdef"
	"idreamshen.com/fmcode/models"
	"idreamshen.com/fmcode/repository"
)

func initBot() {
	// Initialize repository
	repository.InitBotRepository()
	// Initialize service
	InitBotService()
}

func TestBotServiceImpl_FindLast(t *testing.T) {
	initBot()
	ctx := context.Background()
	service := GetBotService()

	// Initially there should be no bots
	lastBot, err := service.FindLast(ctx)
	if err != nil {
		t.Fatalf("Failed to find last bot: %v", err)
	}
	if lastBot != nil {
		t.Errorf("Expected no bots initially, got %+v", lastBot)
	}

	// Create a bot
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create bot: %v", err)
	}

	// Find the last bot
	lastBot, err = service.FindLast(ctx)
	if err != nil {
		t.Fatalf("Failed to find last bot: %v", err)
	}
	if lastBot == nil {
		t.Fatal("Expected to find last bot, got nil")
	}
	if lastBot.ID != bot.ID {
		t.Errorf("Expected last bot ID to be %d, got %d", bot.ID, lastBot.ID)
	}
}

func TestBotServiceImpl_Add(t *testing.T) {
	initBot()
	ctx := context.Background()
	service := GetBotService()

	// Before adding a bot, there should be no bots
	lastBot, err := service.FindLast(ctx)
	if err != nil {
		t.Fatalf("Failed to find last bot: %v", err)
	}
	if lastBot != nil {
		t.Errorf("Expected no bots initially, got %+v", lastBot)
	}

	// Add a bot
	err = service.Add(ctx)
	if err != nil {
		t.Fatalf("Failed to add bot: %v", err)
	}

	// After adding, there should be one bot
	lastBot, err = service.FindLast(ctx)
	if err != nil {
		t.Fatalf("Failed to find last bot: %v", err)
	}
	if lastBot == nil {
		t.Fatal("Expected to find last bot, got nil")
	}
	if lastBot.ID != 1 {
		t.Errorf("Expected last bot ID to be 1, got %d", lastBot.ID)
	}
}

func TestBotServiceImpl_Delete(t *testing.T) {
	initBot()
	ctx := context.Background()
	service := GetBotService()

	// Create a bot
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create bot: %v", err)
	}

	// Delete the bot
	err = service.Delete(ctx, bot)
	if err != nil {
		t.Fatalf("Failed to delete bot: %v", err)
	}

	// After deletion, there should be no bots
	lastBot, err := service.FindLast(ctx)
	if err != nil {
		t.Fatalf("Failed to find last bot: %v", err)
	}
	if lastBot != nil {
		t.Errorf("Expected no bots after deletion, got %+v", lastBot)
	}

	// Test deleting nil bot
	err = service.Delete(ctx, nil)
	if err != nil {
		t.Fatalf("Deleting nil bot should not return error, but got: %v", err)
	}
}

func TestBotServiceImpl_ChangeStatusToCooking(t *testing.T) {
	initBot()
	ctx := context.Background()
	service := GetBotService()

	// Create a bot
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create bot: %v", err)
	}

	// Create an order
	order := &models.Order{
		ID:         1,
		CustomerID: 1001,
		Priority:   consts.OrderPriorityNormal,
		Status:     consts.OrderStatusPending,
	}

	// Change bot status to cooking
	err = service.ChangeStatusToCooking(ctx, bot, order)
	if err != nil {
		t.Fatalf("Failed to change bot status to cooking: %v", err)
	}

	if bot.Status != consts.BotStatusCooking {
		t.Errorf("Expected bot status to be cooking(%d), got %d", consts.BotStatusCooking, bot.Status)
	}
	if bot.OrderID != order.ID {
		t.Errorf("Expected bot order ID to be %d, got %d", order.ID, bot.OrderID)
	}

	// Test nil bot
	err = service.ChangeStatusToCooking(ctx, nil, order)
	if err != errdef.ErrBotNotFound {
		t.Errorf("Expected error %v, got %v", errdef.ErrBotNotFound, err)
	}

	// Test nil order
	err = service.ChangeStatusToCooking(ctx, bot, nil)
	if err != errdef.ErrOrderNotFound {
		t.Errorf("Expected error %v, got %v", errdef.ErrOrderNotFound, err)
	}

	// Test non-idle bot
	nonIdleBot := &models.Bot{
		ID:      2,
		Status:  consts.BotStatusCooking,
		OrderID: 999,
	}
	err = service.ChangeStatusToCooking(ctx, nonIdleBot, order)
	if err != errdef.ErrBotStatusNotIdle {
		t.Errorf("Expected error %v, got %v", errdef.ErrBotStatusNotIdle, err)
	}
}

func TestBotServiceImpl_ChangeStatusToIdle(t *testing.T) {
	initBot()

	ctx := context.Background()
	service := GetBotService()

	// Create a bot
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create bot: %v", err)
	}

	// Create an order
	order := &models.Order{
		ID:         1,
		CustomerID: 1001,
		Priority:   consts.OrderPriorityNormal,
		Status:     consts.OrderStatusPending,
	}

	// First change bot status to cooking
	err = service.ChangeStatusToCooking(ctx, bot, order)
	if err != nil {
		t.Fatalf("Failed to change bot status to cooking: %v", err)
	}

	// Change bot status to idle
	err = service.ChangeStatusToIdle(ctx, bot)
	if err != nil {
		t.Fatalf("Failed to change bot status to idle: %v", err)
	}

	if bot.Status != consts.BotStatusIdle {
		t.Errorf("Expected bot status to be idle(%d), got %d", consts.BotStatusIdle, bot.Status)
	}
	if bot.OrderID != 0 {
		t.Errorf("Expected bot order ID to be 0, got %d", bot.OrderID)
	}

	// Test nil bot
	err = service.ChangeStatusToIdle(ctx, nil)
	if err != errdef.ErrBotNotFound {
		t.Errorf("Expected error %v, got %v", errdef.ErrBotNotFound, err)
	}

	// Test non-cooking bot
	idleBot := &models.Bot{
		ID:      2,
		Status:  consts.BotStatusIdle,
		OrderID: 0,
	}
	err = service.ChangeStatusToIdle(ctx, idleBot)
	if err != errdef.ErrBotStatusNotCooking {
		t.Errorf("Expected error %v, got %v", errdef.ErrBotStatusNotCooking, err)
	}
}

func TestBotServiceImpl_MultipleOperations(t *testing.T) {
	initBot()

	ctx := context.Background()
	service := GetBotService()

	// Add multiple bots
	for i := 0; i < 3; i++ {
		err := service.Add(ctx)
		if err != nil {
			t.Fatalf("Failed to add bot %d: %v", i+1, err)
		}
	}

	// Find the last bot
	lastBot, err := service.FindLast(ctx)
	if err != nil {
		t.Fatalf("Failed to find last bot: %v", err)
	}
	if lastBot == nil {
		t.Fatal("Expected to find last bot, got nil")
	}
	if lastBot.ID != 3 {
		t.Errorf("Expected last bot ID to be 3, got %d", lastBot.ID)
	}

	// Create an order
	order := &models.Order{
		ID:         1,
		CustomerID: 1001,
		Priority:   consts.OrderPriorityNormal,
		Status:     consts.OrderStatusPending,
	}

	// Change bot status to cooking
	err = service.ChangeStatusToCooking(ctx, lastBot, order)
	if err != nil {
		t.Fatalf("Failed to change bot status to cooking: %v", err)
	}

	// Delete the second bot
	secondBot, _ := repository.GetBotRepository().FindByID(ctx, 2)
	err = service.Delete(ctx, secondBot)
	if err != nil {
		t.Fatalf("Failed to delete second bot: %v", err)
	}

	// Change last bot status to idle
	err = service.ChangeStatusToIdle(ctx, lastBot)
	if err != nil {
		t.Fatalf("Failed to change bot status to idle: %v", err)
	}

	// Delete the last bot
	err = service.Delete(ctx, lastBot)
	if err != nil {
		t.Fatalf("Failed to delete last bot: %v", err)
	}

	// Find the last bot, should be the first bot
	lastBot, err = service.FindLast(ctx)
	if err != nil {
		t.Fatalf("Failed to find last bot: %v", err)
	}
	if lastBot == nil {
		t.Fatal("Expected to find last bot, got nil")
	}
	if lastBot.ID != 1 {
		t.Errorf("Expected last bot ID to be 1, got %d", lastBot.ID)
	}
}
