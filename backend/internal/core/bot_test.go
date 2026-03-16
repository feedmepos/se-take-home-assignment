package core

import "testing"

func TestNewBot(t *testing.T) {
	b := NewBot(1)
	if b.ID != 1 {
		t.Errorf("expected ID 1, got %d", b.ID)
	}
	if b.Status != Idle {
		t.Errorf("expected Idle, got %v", b.Status)
	}
	if b.Order != nil {
		t.Error("expected nil order")
	}
}

func TestBotAssignOrder(t *testing.T) {
	b := NewBot(1)
	o := &Order{ID: 1, Type: Normal, Status: Pending}
	b.Assign(o)
	if b.Status != BotProcessing {
		t.Errorf("expected Processing, got %v", b.Status)
	}
	if b.Order.ID != 1 {
		t.Errorf("expected order 1, got %d", b.Order.ID)
	}
	if o.Status != Processing {
		t.Errorf("expected order status Processing, got %v", o.Status)
	}
}

func TestBotComplete(t *testing.T) {
	b := NewBot(1)
	o := &Order{ID: 1, Type: Normal, Status: Pending}
	b.Assign(o)
	completed := b.Complete()
	if b.Status != Idle {
		t.Errorf("expected Idle, got %v", b.Status)
	}
	if completed.Status != Complete {
		t.Errorf("expected Complete, got %v", completed.Status)
	}
	if b.Order != nil {
		t.Error("expected nil order after complete")
	}
}

func TestBotCancelOrder(t *testing.T) {
	b := NewBot(1)
	o := &Order{ID: 1, Type: Normal, Status: Pending}
	b.Assign(o)
	cancelled := b.Cancel()
	if cancelled.ID != 1 {
		t.Errorf("expected order 1, got %d", cancelled.ID)
	}
	if b.Order != nil {
		t.Error("expected nil order after cancel")
	}
}
