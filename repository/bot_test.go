package repository

import (
	"context"
	"testing"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/models"
)

func TestBotPoolMemory_GenerateID(t *testing.T) {
	pool := &BotPoolMemory{
		currentBotID: 0,
	}
	ctx := context.Background()

	id1 := pool.GenerateID(ctx)
	if id1 != 1 {
		t.Errorf("Expected first ID to be 1, got %d", id1)
	}

	id2 := pool.GenerateID(ctx)
	if id2 != 2 {
		t.Errorf("Expected second ID to be 2, got %d", id2)
	}
}

func TestBotPoolMemory_Create(t *testing.T) {
	// 为每个测试初始化一个新的存储库
	InitBotRepository()
	pool := botStoragePtr.(*BotPoolMemory)
	ctx := context.Background()

	// Create a bot
	bot, err := pool.Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create bot: %v", err)
	}

	// Verify bot attributes
	if bot.ID != 1 {
		t.Errorf("Expected bot ID to be 1, got %d", bot.ID)
	}
	if bot.Status != consts.BotStatusIdle {
		t.Errorf("Expected bot status to be idle(%d), got %d", consts.BotStatusIdle, bot.Status)
	}
	if bot.OrderID != 0 {
		t.Errorf("Expected bot order ID to be 0, got %d", bot.OrderID)
	}

	// Verify bot has been added to the pool
	if pool.Bots.Len() != 1 {
		t.Errorf("Expected 1 bot in pool, got %d", pool.Bots.Len())
	}
	if len(pool.BotMap) != 1 {
		t.Errorf("Expected 1 bot in BotMap, got %d", len(pool.BotMap))
	}
	if _, ok := pool.BotMap[bot.ID]; !ok {
		t.Errorf("Bot with ID %d not found in BotMap", bot.ID)
	}
}

func TestBotPoolMemory_FindByID(t *testing.T) {
	InitBotRepository()
	pool := botStoragePtr.(*BotPoolMemory)
	ctx := context.Background()

	// Create a bot
	bot, err := pool.Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create bot: %v", err)
	}

	// Find bot by ID
	foundBot, err := pool.FindByID(ctx, bot.ID)
	if err != nil {
		t.Fatalf("Failed to find bot: %v", err)
	}
	if foundBot == nil {
		t.Fatal("Expected to find bot, got nil")
	}
	if foundBot.ID != bot.ID {
		t.Errorf("Expected bot ID to be %d, got %d", bot.ID, foundBot.ID)
	}

	// Try to find non-existent bot
	nonExistentBot, err := pool.FindByID(ctx, 9999)
	if err != nil {
		t.Fatalf("Unexpected error when finding non-existent bot: %v", err)
	}
	if nonExistentBot != nil {
		t.Errorf("Expected nil for non-existent bot, got %+v", nonExistentBot)
	}
}

func TestBotPoolMemory_FindLast(t *testing.T) {
	InitBotRepository()
	pool := botStoragePtr.(*BotPoolMemory)
	ctx := context.Background()

	// Initially there should be no bots
	lastBot, err := pool.FindLast(ctx)
	if err != nil {
		t.Fatalf("Failed to find last bot: %v", err)
	}
	if lastBot != nil {
		t.Errorf("Expected no bots initially, got %+v", lastBot)
	}

	// Create multiple bots
	bots := make([]*models.Bot, 3)
	for i := 0; i < 3; i++ {
		bot, err := pool.Create(ctx)
		if err != nil {
			t.Fatalf("Failed to create bot %d: %v", i+1, err)
		}
		bots[i] = bot
	}

	// Find the last bot
	lastBot, err = pool.FindLast(ctx)
	if err != nil {
		t.Fatalf("Failed to find last bot: %v", err)
	}
	if lastBot == nil {
		t.Fatal("Expected to find last bot, got nil")
	}
	if lastBot.ID != bots[2].ID {
		t.Errorf("Expected last bot ID to be %d, got %d", bots[2].ID, lastBot.ID)
	}
}

func TestBotPoolMemory_Delete(t *testing.T) {
	InitBotRepository()
	pool := botStoragePtr.(*BotPoolMemory)
	ctx := context.Background()

	// Create a bot
	bot, err := pool.Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create bot: %v", err)
	}

	// Delete the bot
	err = pool.Delete(ctx, bot)
	if err != nil {
		t.Fatalf("Failed to delete bot: %v", err)
	}

	// Verify bot has been removed from the pool
	if pool.Bots.Len() != 0 {
		t.Errorf("Expected 0 bots in pool, got %d", pool.Bots.Len())
	}
	if len(pool.BotMap) != 0 {
		t.Errorf("Expected 0 bots in BotMap, got %d", len(pool.BotMap))
	}
	if _, ok := pool.BotMap[bot.ID]; ok {
		t.Errorf("Deleted bot %d still found in BotMap", bot.ID)
	}

	// Test deleting nil bot
	err = pool.Delete(ctx, nil)
	if err != nil {
		t.Fatalf("Deleting nil bot should not return error, but got: %v", err)
	}
}

func TestBotPoolMemory_MultipleOperations(t *testing.T) {
	InitBotRepository()
	pool := botStoragePtr.(*BotPoolMemory)
	ctx := context.Background()

	// Create multiple bots
	bots := make([]*models.Bot, 5)
	for i := 0; i < 5; i++ {
		bot, err := pool.Create(ctx)
		if err != nil {
			t.Fatalf("Failed to create bot %d: %v", i+1, err)
		}
		bots[i] = bot
	}

	// Verify bot count
	if pool.Bots.Len() != 5 {
		t.Errorf("Expected 5 bots in pool, got %d", pool.Bots.Len())
	}

	// Delete middle bot
	err := pool.Delete(ctx, bots[2])
	if err != nil {
		t.Fatalf("Failed to delete bot: %v", err)
	}

	// Verify bot count after deletion
	if pool.Bots.Len() != 4 {
		t.Errorf("After deleting one, expected 4 bots in pool, got %d", pool.Bots.Len())
	}

	// Find the last bot
	lastBot, err := pool.FindLast(ctx)
	if err != nil {
		t.Fatalf("Failed to find last bot: %v", err)
	}
	if lastBot.ID != bots[4].ID {
		t.Errorf("Expected last bot ID to be %d, got %d", bots[4].ID, lastBot.ID)
	}

	// Create another bot
	newBot, err := pool.Create(ctx)
	if err != nil {
		t.Fatalf("Failed to create new bot: %v", err)
	}

	// Verify new bot is the last one
	lastBot, err = pool.FindLast(ctx)
	if err != nil {
		t.Fatalf("Failed to find last bot: %v", err)
	}
	if lastBot.ID != newBot.ID {
		t.Errorf("Expected last bot ID to be %d, got %d", newBot.ID, lastBot.ID)
	}
}
