package bot

import (
	"testing"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/model"
)

// --- 2.1 新建 Bot ---

func TestNewBotIsIdle(t *testing.T) {
	b := NewBot(1, nil)
	if b.Status != model.BotIdle {
		t.Errorf("new bot Status = %v, want Idle", b.Status)
	}
}

func TestNewBotNoCurrentOrder(t *testing.T) {
	b := NewBot(1, nil)
	if b.CurrentOrder != nil {
		t.Errorf("new bot CurrentOrder = %v, want nil", b.CurrentOrder)
	}
}

// --- 2.2 Assign ---

func TestAssignTransitionsToProcessing(t *testing.T) {
	b := NewBot(1, nil)
	o := &model.Order{ID: 1001, Type: model.OrderNormal}
	doneCh := make(chan time.Time)

	err := b.Assign(o, doneCh)
	if err != nil {
		t.Fatalf("Assign returned error: %v", err)
	}
	if b.Status != model.BotProcessing {
		t.Errorf("after Assign Status = %v, want Processing", b.Status)
	}
}

func TestAssignSetsCurrentOrder(t *testing.T) {
	b := NewBot(1, nil)
	o := &model.Order{ID: 1001, Type: model.OrderNormal}
	doneCh := make(chan time.Time)

	_ = b.Assign(o, doneCh)
	if b.CurrentOrder != o {
		t.Error("Assign did not set CurrentOrder")
	}
}

func TestAssignOnBusyBotReturnsError(t *testing.T) {
	b := NewBot(1, nil)
	o1 := &model.Order{ID: 1001}
	o2 := &model.Order{ID: 1002}
	doneCh := make(chan time.Time)

	_ = b.Assign(o1, doneCh)
	err := b.Assign(o2, doneCh)
	if err == nil {
		t.Error("Assign on busy bot should return error")
	}
}

// --- 2.3 正常完成 ---

func TestOnCompleteCalledWhenTimerFires(t *testing.T) {
	callbacks := &model.BotCallbacks{}
	completeCalled := false
	var completedOrder *model.Order
	callbacks.OnComplete = func(o *model.Order) {
		completeCalled = true
		completedOrder = o
	}

	b := NewBot(1, callbacks)
	o := &model.Order{ID: 1001, Type: model.OrderNormal}
	doneCh := make(chan time.Time)

	_ = b.Assign(o, doneCh)

	// simulate timer firing
	close(doneCh)

	// give goroutine a moment
	time.Sleep(10 * time.Millisecond)

	if !completeCalled {
		t.Error("OnComplete was not called when timer fired")
	}
	if completedOrder != o {
		t.Errorf("OnComplete order = %v, want %v", completedOrder, o)
	}
}

func TestBotReturnsToIdleAfterComplete(t *testing.T) {
	callbacks := &model.BotCallbacks{}
	// OnComplete callback that resets the bot
	callbacks.OnComplete = func(o *model.Order) {
		// In production this would be done by Controller
	}

	b := NewBot(1, callbacks)
	o := &model.Order{ID: 1001}
	doneCh := make(chan time.Time)

	_ = b.Assign(o, doneCh)
	close(doneCh)
	time.Sleep(10 * time.Millisecond)

	// After Assign + completion, bot should still be in PROCESSING
	// unless the callback explicitly resets it. The controller will
	// call a method to reset the bot after OnComplete.
	// We test that the bot's state can be reset.
	b.Reset()

	if b.Status != model.BotIdle {
		t.Errorf("after Reset Status = %v, want Idle", b.Status)
	}
	if b.CurrentOrder != nil {
		t.Errorf("after Reset CurrentOrder = %v, want nil", b.CurrentOrder)
	}
}

// --- 2.4 中断（stopCh） ---

func TestStopChPreventsOnComplete(t *testing.T) {
	callbacks := &model.BotCallbacks{}
	completeCalled := false
	callbacks.OnComplete = func(o *model.Order) {
		completeCalled = true
	}

	b := NewBot(1, callbacks)
	o := &model.Order{ID: 1001}
	doneCh := make(chan time.Time)

	_ = b.Assign(o, doneCh)

	// stop the bot (simulates Controller.RemoveBot)
	b.Stop()
	time.Sleep(10 * time.Millisecond)

	if completeCalled {
		t.Error("OnComplete should not be called after Stop")
	}
}

func TestBotCanReassignAfterStop(t *testing.T) {
	b := NewBot(1, nil)
	o1 := &model.Order{ID: 1001}
	doneCh1 := make(chan time.Time)

	_ = b.Assign(o1, doneCh1)
	b.Stop()
	time.Sleep(10 * time.Millisecond)

	// Reset after stop
	b.Reset()

	o2 := &model.Order{ID: 1002}
	doneCh2 := make(chan time.Time)
	err := b.Assign(o2, doneCh2)
	if err != nil {
		t.Errorf("Assign after Stop+Reset returned error: %v", err)
	}
	if b.Status != model.BotProcessing {
		t.Errorf("after reassign Status = %v, want Processing", b.Status)
	}
}

// --- 2.5 停止 IDLE Bot ---

func TestStopIdleBotNoPanic(t *testing.T) {
	b := NewBot(1, nil)

	// should not panic
	b.Stop()

	if b.Status != model.BotIdle {
		t.Errorf("Stop on idle bot changed Status to %v, want Idle", b.Status)
	}
}
