package repositories

import (
	"testing"
)

func TestInMemoryBotRepository_AddBot(t *testing.T) {
	repo := NewInMemoryBotRepository()

	bot, err := repo.AddBot()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if bot.ID != 1 {
		t.Errorf("Expected bot ID to be 1, got %d", bot.ID)
	}

	if bot.IsProcessing {
		t.Error("Expected bot to be idle initially")
	}
}

func TestInMemoryBotRepository_GetIdleBots(t *testing.T) {
	repo := NewInMemoryBotRepository()

	repo.AddBot()
	repo.AddBot()

	idle := repo.GetIdleBots()
	if len(idle) != 2 {
		t.Errorf("Expected 2 idle bots, got %d", len(idle))
	}

	// Set one bot to processing
	repo.UpdateBotStatus(1, true, 1)

	idle = repo.GetIdleBots()
	if len(idle) != 1 {
		t.Errorf("Expected 1 idle bot, got %d", len(idle))
	}
}

func TestInMemoryBotRepository_RemoveBot(t *testing.T) {
	repo := NewInMemoryBotRepository()

	repo.AddBot()
	repo.AddBot()
	repo.AddBot()

	bots := repo.GetAllBots()
	if len(bots) != 3 {
		t.Errorf("Expected 3 bots, got %d", len(bots))
	}

	err := repo.RemoveBot()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	bots = repo.GetAllBots()
	if len(bots) != 2 {
		t.Errorf("Expected 2 bots after removal, got %d", len(bots))
	}

	// Verify the newest bot (ID 3) was removed
	for _, bot := range bots {
		if bot.ID == 3 {
			t.Error("Expected bot with ID 3 to be removed")
		}
	}
}
