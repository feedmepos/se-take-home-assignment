package bot

import (
	"testing"
	"time"

	"github.com/se-take-home-assignment/internal/model"
)

func init() {
	// Speed up tests by reducing process duration
	ProcessDuration = 100 * time.Millisecond
}

func TestBotProcessOrder(t *testing.T) {
	completed := make(chan *model.Order, 1)

	b := New(1, func(bot *Bot, order *model.Order) {
		completed <- order
	})

	order := &model.Order{ID: 1, Type: model.Normal, Status: model.Pending}
	b.Process(order)

	if b.IsIdle() {
		t.Error("bot should not be idle while processing")
	}

	select {
	case o := <-completed:
		if o.ID != 1 {
			t.Errorf("expected order #1, got #%d", o.ID)
		}
		if o.Status != model.Complete {
			t.Errorf("expected Complete status, got %v", o.Status)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timed out waiting for order completion")
	}
}

func TestBotStopReturnsOrder(t *testing.T) {
	b := New(1, func(bot *Bot, order *model.Order) {
		t.Error("callback should not be called after stop")
	})

	order := &model.Order{ID: 1, Type: model.Normal, Status: model.Pending}
	b.Process(order)

	// Stop immediately before processing completes
	returned := b.Stop()

	if returned == nil {
		t.Fatal("expected order to be returned")
	}
	if returned.ID != 1 {
		t.Errorf("expected order #1, got #%d", returned.ID)
	}
	if returned.Status != model.Pending {
		t.Errorf("expected Pending status, got %v", returned.Status)
	}
	if !b.IsIdle() {
		t.Error("bot should be idle after stop")
	}

	// Wait to ensure callback is not triggered
	time.Sleep(200 * time.Millisecond)
}

func TestBotStopWhenIdle(t *testing.T) {
	b := New(1, nil)

	returned := b.Stop()
	if returned != nil {
		t.Errorf("expected nil when stopping idle bot, got %v", returned)
	}
}
