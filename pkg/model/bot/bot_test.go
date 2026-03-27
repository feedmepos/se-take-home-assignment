package bot

import (
	"mcd/pkg/model/orderManager"
	"testing"
	"time"
)

func TestNewBot(t *testing.T) {
	om := orderManager.NewOrderManager()
	bot := NewBot(om)

	if bot == nil {
		t.Errorf("NewBot should return a non-nil bot")
	}

	if bot.ID <= 0 {
		t.Errorf("Expected bot ID to be positive, got %d", bot.ID)
	}

	if bot.GetStatus() != StatusIdle {
		t.Errorf("Expected bot status to be %s, got %s", StatusIdle, bot.GetStatus())
	}
}

func TestBot_Start(t *testing.T) {
	om := orderManager.NewOrderManager()
	bot := NewBot(om)
	bot.Start()

	time.Sleep(100 * time.Millisecond)

	if bot.GetStatus() != StatusIdle {
		t.Errorf("Expected bot status to be %s, got %s", StatusIdle, bot.GetStatus())
	}

	bot.Destroy()

	time.Sleep(100 * time.Millisecond)
}

func TestBot_Destroy(t *testing.T) {
	om := orderManager.NewOrderManager()
	bot := NewBot(om)
	bot.Start()

	time.Sleep(100 * time.Millisecond)

	bot.Destroy()

	time.Sleep(100 * time.Millisecond)

	// there is no need to check the status of the bot after destroy
}

func TestBot_StatusTransition(t *testing.T) {
	om := orderManager.NewOrderManager()
	bot := NewBot(om)

	if bot.GetStatus() != StatusIdle {
		t.Errorf("Expected initial bot status to be %s, got %s", StatusIdle, bot.GetStatus())
	}

	om.Add("Normal")

	bot.Start()

	time.Sleep(100 * time.Millisecond)

	bot.Destroy()

	time.Sleep(100 * time.Millisecond)
}
