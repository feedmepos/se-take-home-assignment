package controller

import (
	"testing"
	"time"
)

func TestBotStatusString(t *testing.T) {
	tests := []struct {
		status   BotStatus
		expected string
	}{
		{Idle, "IDLE"},
		{Processing, "PROCESSING"},
		{BotStatus(999), "Unknown"},
	}

	for _, tt := range tests {
		if got := tt.status.String(); got != tt.expected {
			t.Errorf("BotStatus.String() = %q, want %q", got, tt.expected)
		}
	}
}

func TestStartProcessing(t *testing.T) {
	bot := &Bot{ID: 1, Status: Idle, onCompleted: make(chan *Order, 1)}
	order := &Order{ID: 1, Status: Pending}

	bot.StartProcessing(order)

	if bot.Status != Processing {
		t.Errorf("Expected status Processing, got %v", bot.Status)
	}
	if bot.CurrentOrder != order {
		t.Errorf("Expected CurrentOrder to be set")
	}
}

func TestStopProcessing(t *testing.T) {
	bot := &Bot{ID: 1, Status: Processing, onCompleted: make(chan *Order, 1)}
	order := &Order{ID: 1, Status: Pending}
	bot.CurrentOrder = order

	returned := bot.StopProcessing()

	if bot.Status != Idle {
		t.Errorf("Expected status Idle, got %v", bot.Status)
	}
	if bot.CurrentOrder != nil {
		t.Errorf("Expected CurrentOrder to be nil")
	}
	if returned != order {
		t.Errorf("Expected returned order to match")
	}
	if order.Status != Pending {
		t.Errorf("Expected order status Pending, got %v", order.Status)
	}
}

func TestCompleteProcessing(t *testing.T) {
	bot := &Bot{ID: 1, Status: Processing}
	order := &Order{ID: 1, Status: Pending}
	bot.CurrentOrder = order

	bot.completeProcessing()

	if bot.Status != Idle {
		t.Errorf("Expected status Idle, got %v", bot.Status)
	}
	if order.Status != Completed {
		t.Errorf("Expected order status Completed, got %v", order.Status)
	}
	if bot.CurrentOrder != nil {
		t.Errorf("Expected CurrentOrder to be nil")
	}
}

func TestProcessingTimeout(t *testing.T) {
	bot := &Bot{ID: 1, Status: Idle, onCompleted: make(chan *Order, 1)}
	order := &Order{ID: 1, Status: Pending}

	bot.StartProcessing(order)
	<-bot.onCompleted

	if order.Status != Completed {
		t.Errorf("Expected order status Completed after timeout")
	}
	if bot.Status != Idle {
		t.Errorf("Expected bot status Idle after timeout")
	}
}

func TestResetTimer(t *testing.T) {
	bot := &Bot{ID: 1, timer: time.AfterFunc(100*time.Millisecond, func() {})}

	bot.resetTimer()

	if bot.timer != nil {
		t.Errorf("Expected timer to be nil after reset")
	}
}
