package listener

import (
	"context"
	"testing"
	"time"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/eventbus"
	"idreamshen.com/fmcode/repository"
	"idreamshen.com/fmcode/service"
)

func setupTest() {
	// Initialize event bus
	eventbus.InitEventBus()

	// Initialize repositories
	repository.InitBotRepository()
	repository.InitOrderRepository()

	// Initialize services
	service.InitBotService()
	service.InitOrderService()
}

func TestProcessOrderCreated(t *testing.T) {
	setupTest()
	ctx := context.Background()

	// Create a bot
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create bot: %v", err)
	}

	// Create a normal order
	order, err := repository.GetOrderRepository().CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Test order processing
	go processOrderCreated(ctx, bot)

	// Wait for processing to complete
	time.Sleep(100 * time.Millisecond)

	// Verify order status has changed to processing
	updatedOrder, err := repository.GetOrderRepository().FindByID(ctx, order.ID)
	if err != nil {
		t.Fatalf("Failed to find order: %v", err)
	}

	if updatedOrder.Status != consts.OrderStatusProcessing {
		t.Errorf("Expected order status to be processing(%d), but got %d", consts.OrderStatusProcessing, updatedOrder.Status)
	}

	if updatedOrder.BotID != bot.ID {
		t.Errorf("Expected order bot ID to be %d, but got %d", bot.ID, updatedOrder.BotID)
	}

	// Verify bot status has changed to cooking
	updatedBot, err := repository.GetBotRepository().FindByID(ctx, bot.ID)
	if err != nil {
		t.Fatalf("Failed to find bot: %v", err)
	}

	if updatedBot.Status != consts.BotStatusCooking {
		t.Errorf("Expected bot status to be cooking(%d), but got %d", consts.BotStatusCooking, updatedBot.Status)
	}

	if updatedBot.OrderID != order.ID {
		t.Errorf("Expected bot order ID to be %d, but got %d", order.ID, updatedBot.OrderID)
	}
}

func TestBotCookOrder(t *testing.T) {
	setupTest()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Create a bot
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create bot: %v", err)
	}

	// Create an order
	order, err := repository.GetOrderRepository().CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Test cooking process cancellation
	go func() {
		// Wait a short time then cancel the order
		time.Sleep(500 * time.Millisecond)
		order.CancelFunc()
	}()

	// Start cooking
	_, err = botCookOrder(ctx, bot, order)
	if err != nil {
		t.Fatalf("Cooking process failed: %v", err)
	}

	// Verify order status has been reset to pending
	updatedOrder, err := repository.GetOrderRepository().FindByID(ctx, order.ID)
	if err != nil {
		t.Fatalf("Failed to find order: %v", err)
	}

	if updatedOrder.Status != consts.OrderStatusPending {
		t.Errorf("Expected order status to be pending(%d), but got %d", consts.OrderStatusPending, updatedOrder.Status)
	}

	// Verify bot status has been reset to idle
	updatedBot, err := repository.GetBotRepository().FindByID(ctx, bot.ID)
	if err != nil {
		t.Fatalf("Failed to find bot: %v", err)
	}

	if updatedBot.Status != consts.BotStatusIdle {
		t.Errorf("Expected bot status to be idle(%d), but got %d", consts.BotStatusIdle, updatedBot.Status)
	}
}

func TestBotCookOrderComplete(t *testing.T) {
	setupTest()
	ctx := context.Background()

	// Create a bot
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create bot: %v", err)
	}

	// Create an order
	order, err := repository.GetOrderRepository().CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	go func() {
		if _, err := botCookOrder(ctx, bot, order); err != nil {
			t.Fatalf("Cooking process failed: %v", err)
		}
	}()

	// Wait enough time for processing to complete
	time.Sleep(consts.OrderCookTime * 2)

	// Verify order status has changed to completed
	updatedOrder, err := repository.GetOrderRepository().FindByID(ctx, order.ID)
	if err != nil {
		t.Fatalf("Failed to find order: %v", err)
	}

	if updatedOrder.Status != consts.OrderStatusCompleted {
		t.Errorf("Expected order status to be completed(%d), but got %d", consts.OrderStatusCompleted, updatedOrder.Status)
	}

	// Verify bot status has changed to idle
	updatedBot, err := repository.GetBotRepository().FindByID(ctx, bot.ID)
	if err != nil {
		t.Fatalf("Failed to find bot: %v", err)
	}

	if updatedBot.Status != consts.BotStatusIdle {
		t.Errorf("Expected bot status to be idle(%d), but got %d", consts.BotStatusIdle, updatedBot.Status)
	}

}

func TestProcessOrderCreatedWithVipOrder(t *testing.T) {
	setupTest()
	ctx := context.Background()

	// Create a bot
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create bot: %v", err)
	}

	// Create a normal order
	_, err = repository.GetOrderRepository().CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create normal order: %v", err)
	}

	// Create a VIP order
	vipOrder, err := repository.GetOrderRepository().CreatePending(ctx, 2001, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("Failed to create VIP order: %v", err)
	}

	// Test order processing
	go processOrderCreated(ctx, bot)

	// Wait for processing to complete
	time.Sleep(100 * time.Millisecond)

	// Verify VIP order is processed first
	updatedVipOrder, err := repository.GetOrderRepository().FindByID(ctx, vipOrder.ID)
	if err != nil {
		t.Fatalf("Failed to find VIP order: %v", err)
	}

	if updatedVipOrder.Status != consts.OrderStatusProcessing {
		t.Errorf("Expected VIP order status to be processing(%d), but got %d", consts.OrderStatusProcessing, updatedVipOrder.Status)
	}

	if updatedVipOrder.BotID != bot.ID {
		t.Errorf("Expected VIP order bot ID to be %d, but got %d", bot.ID, updatedVipOrder.BotID)
	}
}

func TestBotCookOrderWithNilBot(t *testing.T) {
	setupTest()
	ctx := context.Background()

	// Create an order
	order, err := repository.GetOrderRepository().CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Test nil bot
	_, err = botCookOrder(ctx, nil, order)
	if err == nil {
		t.Error("Expected error when using nil bot, but got none")
	}
}

func TestBotCookOrderWithNilOrder(t *testing.T) {
	setupTest()
	ctx := context.Background()

	// Create a bot
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create bot: %v", err)
	}

	// Test nil order
	_, err = botCookOrder(ctx, bot, nil)
	if err == nil {
		t.Error("Expected error when using nil order, but got none")
	}
}
