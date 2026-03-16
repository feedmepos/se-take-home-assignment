package bot

import (
	"assignment/internal/order"
	"testing"
	"time"
)

func TestNewBot(t *testing.T) {
	bot := NewBot(1)
	
	if bot.ID != 1 {
		t.Errorf("Expected bot ID 1, got %d", bot.ID)
	}
	
	if bot.Status != IDLE {
		t.Errorf("Expected IDLE status, got %v", bot.Status)
	}
	
	if bot.CurrentOrder != nil {
		t.Error("Expected CurrentOrder to be nil for new bot")
	}
	
	if bot.CreatedAt.IsZero() {
		t.Error("Expected CreatedAt to be set")
	}
}

func TestStartProcessing(t *testing.T) {
	bot := NewBot(1)
	o := order.NewOrder(1, order.Normal)
	
	start := time.Now()
	completed := bot.StartProcessing(o)
	duration := time.Since(start)
	
	if !completed {
		t.Error("Expected processing to complete")
	}
	
	if duration < 10*time.Second {
		t.Errorf("Expected processing to take at least 10 seconds, took %v", duration)
	}
	
	if o.Status != order.COMPLETE {
		t.Errorf("Expected order status COMPLETE, got %v", o.Status)
	}
	
	if bot.Status != IDLE {
		t.Errorf("Expected bot status IDLE after completion, got %v", bot.Status)
	}
	
	if bot.CurrentOrder != nil {
		t.Error("Expected CurrentOrder to be nil after completion")
	}
}

func TestStopProcessing(t *testing.T) {
	bot := NewBot(1)
	o := order.NewOrder(1, order.Normal)
	
	// Start processing in a goroutine
	done := make(chan bool)
	go func() {
		completed := bot.StartProcessing(o)
		done <- completed
	}()
	
	// Wait a bit, then stop
	time.Sleep(2 * time.Second)
	bot.Stop()
	
	// Wait for processing to finish
	completed := <-done
	
	if completed {
		t.Error("Expected processing to be cancelled")
	}
	
	if o.Status != order.PENDING {
		t.Errorf("Expected order status PENDING after cancellation, got %v", o.Status)
	}
	
	if bot.Status != IDLE {
		t.Errorf("Expected bot status IDLE after cancellation, got %v", bot.Status)
	}
}

func TestIsIdle(t *testing.T) {
	bot := NewBot(1)
	
	if !bot.IsIdle() {
		t.Error("Expected new bot to be idle")
	}
}

func TestIsProcessing(t *testing.T) {
	bot := NewBot(1)
	o := order.NewOrder(1, order.Normal)
	
	// Start processing in a goroutine
	go bot.StartProcessing(o)
	
	// Give it a moment to start
	time.Sleep(100 * time.Millisecond)
	
	if !bot.IsProcessing() {
		t.Error("Expected bot to be processing")
	}
	
	// Wait for completion
	time.Sleep(11 * time.Second)
	
	if bot.IsProcessing() {
		t.Error("Expected bot to be idle after completion")
	}
}

func TestBotStatusString(t *testing.T) {
	if IDLE.String() != "IDLE" {
		t.Errorf("Expected 'IDLE', got '%s'", IDLE.String())
	}
	
	if PROCESSING.String() != "PROCESSING" {
		t.Errorf("Expected 'PROCESSING', got '%s'", PROCESSING.String())
	}
}
