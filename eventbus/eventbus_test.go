package eventbus

import (
	"context"
	"testing"
	"time"
)

func TestInitEventBus(t *testing.T) {
	// Initialize event bus
	InitEventBus()
	
	// Verify channels are created
	if orderCreatedChan == nil {
		t.Error("Expected orderCreatedChan to be initialized, but it was nil")
	}
	
	if botAddedChan == nil {
		t.Error("Expected botAddedChan to be initialized, but it was nil")
	}
}

func TestPublishOrderCreated(t *testing.T) {
	// Initialize event bus
	InitEventBus()
	ctx := context.Background()
	
	// Publish order created event
	orderID := int64(123)
	go PublishOrderCreated(ctx, orderID)
	
	// Receive event from channel
	select {
	case receivedID := <-GetOrderCreatedChan(ctx):
		if receivedID != orderID {
			t.Errorf("Expected to receive order ID %d, but got %d", orderID, receivedID)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("Timeout receiving order created event")
	}
}

func TestPublishBotAdded(t *testing.T) {
	// Initialize event bus
	InitEventBus()
	ctx := context.Background()
	
	// Publish bot added event
	botID := int64(456)
	go PublishBotAdded(ctx, botID)
	
	// Receive event from channel
	select {
	case receivedID := <-GetBotAddedChan(ctx):
		if receivedID != botID {
			t.Errorf("Expected to receive bot ID %d, but got %d", botID, receivedID)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("Timeout receiving bot added event")
	}
}

func TestGetOrderCreatedChan(t *testing.T) {
	// Initialize event bus
	InitEventBus()
	ctx := context.Background()
	
	// Get order created channel
	ch := GetOrderCreatedChan(ctx)
	
	// Verify channel is not nil
	if ch == nil {
		t.Error("Expected to get non-nil order created channel, but got nil")
	}
	
	// Verify channel is orderCreatedChan
	if ch != orderCreatedChan {
		t.Error("Expected to get orderCreatedChan, but got a different channel")
	}
}

func TestGetBotAddedChan(t *testing.T) {
	// Initialize event bus
	InitEventBus()
	ctx := context.Background()
	
	// Get bot added channel
	ch := GetBotAddedChan(ctx)
	
	// Verify channel is not nil
	if ch == nil {
		t.Error("Expected to get non-nil bot added channel, but got nil")
	}
	
	// Verify channel is botAddedChan
	if ch != botAddedChan {
		t.Error("Expected to get botAddedChan, but got a different channel")
	}
}

func TestChannelCapacity(t *testing.T) {
	// Initialize event bus
	InitEventBus()
	
	// Verify order created channel capacity
	if cap(orderCreatedChan) != 1024 {
		t.Errorf("Expected order created channel capacity to be 1024, but got %d", cap(orderCreatedChan))
	}
	
	// Verify bot added channel capacity
	if cap(botAddedChan) != 64 {
		t.Errorf("Expected bot added channel capacity to be 64, but got %d", cap(botAddedChan))
	}
}

func TestMultiplePublishOrderCreated(t *testing.T) {
	// Initialize event bus
	InitEventBus()
	ctx := context.Background()
	
	// Publish multiple order created events
	orderIDs := []int64{1, 2, 3, 4, 5}
	receivedIDs := make([]int64, 0, len(orderIDs))
	
	// Start receiving goroutine
	done := make(chan bool)
	go func() {
		for i := 0; i < len(orderIDs); i++ {
			select {
			case id := <-GetOrderCreatedChan(ctx):
				receivedIDs = append(receivedIDs, id)
			case <-time.After(100 * time.Millisecond):
				t.Error("Timeout receiving order created event")
			}
		}
		done <- true
	}()
	
	// Publish events
	for _, id := range orderIDs {
		PublishOrderCreated(ctx, id)
	}
	
	// Wait for receiving to complete
	<-done
	
	// Verify number of received IDs
	if len(receivedIDs) != len(orderIDs) {
		t.Errorf("Expected to receive %d order IDs, but got %d", len(orderIDs), len(receivedIDs))
	}
	
	// Verify received IDs are correct (order may differ)
	for _, id := range orderIDs {
		found := false
		for _, receivedID := range receivedIDs {
			if id == receivedID {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Did not receive order ID %d", id)
		}
	}
}

func TestMultiplePublishBotAdded(t *testing.T) {
	// Initialize event bus
	InitEventBus()
	ctx := context.Background()
	
	// Publish multiple bot added events
	botIDs := []int64{101, 102, 103}
	receivedIDs := make([]int64, 0, len(botIDs))
	
	// Start receiving goroutine
	done := make(chan bool)
	go func() {
		for i := 0; i < len(botIDs); i++ {
			select {
			case id := <-GetBotAddedChan(ctx):
				receivedIDs = append(receivedIDs, id)
			case <-time.After(100 * time.Millisecond):
				t.Error("Timeout receiving bot added event")
			}
		}
		done <- true
	}()
	
	// Publish events
	for _, id := range botIDs {
		PublishBotAdded(ctx, id)
	}
	
	// Wait for receiving to complete
	<-done
	
	// Verify number of received IDs
	if len(receivedIDs) != len(botIDs) {
		t.Errorf("Expected to receive %d bot IDs, but got %d", len(botIDs), len(receivedIDs))
	}
	
	// Verify received IDs are correct (order may differ)
	for _, id := range botIDs {
		found := false
		for _, receivedID := range receivedIDs {
			if id == receivedID {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Did not receive bot ID %d", id)
		}
	}
}
