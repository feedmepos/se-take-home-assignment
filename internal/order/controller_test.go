package order

import (
	"context"
	"testing"
	"time"
)

func TestAddOrder(t *testing.T) {
	c := NewController()
	c.cookDuration = 10 * time.Millisecond
	defer c.Stop()

	ctx := context.Background()
	c.Send(ctx, Command{Type: CreateNormalOrder})
	c.Send(ctx, Command{Type: CreateVIPOrder})

	state := c.Send(ctx, Command{Type: GetStateCommand}).State

	if state.VipQueueLen != 1 {
		t.Errorf("expected 1 VIP order, got %d", state.VipQueueLen)
	}
	if state.NormQueueLen != 1 {
		t.Errorf("expected 1 Normal order, got %d", state.NormQueueLen)
	}
}

func TestBotProcessingAndVIPPriority(t *testing.T) {
	c := NewController()
	c.cookDuration = 20 * time.Millisecond
	defer c.Stop()

	ctx := context.Background()
	c.Send(ctx, Command{Type: CreateNormalOrder}) // 1001
	c.Send(ctx, Command{Type: CreateVIPOrder})    // 1002
	c.Send(ctx, Command{Type: AddBotCommand})     // Bot 1: should immediately pick up VIP 1002

	// Verify that Bot 1 is processing 1002 and 1001 is pending
	state := c.Send(ctx, Command{Type: GetStateCommand}).State
	if state.VipQueueLen != 0 {
		t.Errorf("expected VIP queue to be empty, got: %d", state.VipQueueLen)
	}
	if state.NormQueueLen != 1 {
		t.Errorf("expected 1 Normal order pending, got: %d", state.NormQueueLen)
	}
	if state.IdleBots != 0 {
		t.Errorf("expected 0 idle bots, got %d", state.IdleBots)
	}

	// Wait for bot to finish cooking VIP 1002 (takes 20ms total)
	time.Sleep(30 * time.Millisecond)

	// Now Bot 1 should have picked up Normal 1001
	state2 := c.Send(ctx, Command{Type: GetStateCommand}).State
	if state2.NormQueueLen != 0 {
		t.Errorf("expected Normal queue to be empty, got: %d", state2.NormQueueLen)
	}

	// Wait for Normal 1001 to finish (takes 20ms total)
	time.Sleep(30 * time.Millisecond)

	state3 := c.Send(ctx, Command{Type: GetStateCommand}).State
	if state3.Completed != 2 {
		t.Errorf("expected 2 completed orders, got %d", state3.Completed)
	}
}

func TestRemoveBotWithInterruption(t *testing.T) {
	c := NewController()
	c.cookDuration = 100 * time.Millisecond
	defer c.Stop()

	ctx := context.Background()
	c.Send(ctx, Command{Type: CreateNormalOrder}) // 1001
	c.Send(ctx, Command{Type: AddBotCommand})     // Bot 1 starts cooking 1001

	time.Sleep(10 * time.Millisecond)

	c.Send(ctx, Command{Type: RemoveBotCommand})

	// Wait a bit to allow the BotDoneCommand (interrupted result) to be processed
	time.Sleep(10 * time.Millisecond)

	state := c.Send(ctx, Command{Type: GetStateCommand}).State
	if state.BotsCount != 0 {
		t.Errorf("expected 0 bots, got %d", state.BotsCount)
	}
	if state.NormQueueLen != 1 {
		t.Errorf("expected Order 1001 back in normal queue, got queue len: %d", state.NormQueueLen)
	}
}

func TestRemoveBotWithNoBots(t *testing.T) {
	c := NewController()
	defer c.Stop()

	ctx := context.Background()
	resp := c.Send(ctx, Command{Type: RemoveBotCommand})
	if resp.Err == nil {
		t.Error("expected error when removing bot with 0 bots, got nil")
	}
	if resp.Err.Error() != "no bots available to remove" {
		t.Errorf("unexpected error message: %v", resp.Err)
	}
}
