package memory

import (
	"testing"

	"feedme-order-controller/internal/usecase/core"
)

func TestBotRegistry_NextBotIDStrictlyIncreasing(t *testing.T) {
	r := NewBotRegistry()
	prev := 0
	for i := 0; i < 10; i++ {
		id := r.NextBotID()
		if id <= prev {
			t.Fatalf("expected strictly increasing IDs, got %d after %d", id, prev)
		}
		prev = id
	}
}

func TestBotRegistry_RemoveNewestLIFO(t *testing.T) {
	r := NewBotRegistry()
	b1 := core.NewBot(r.NextBotID())
	b2 := core.NewBot(r.NextBotID())
	b3 := core.NewBot(r.NextBotID())
	r.Add(b1)
	r.Add(b2)
	r.Add(b3)

	got, ok := r.RemoveNewest()
	if !ok || got != b3 {
		t.Fatalf("expected b3 (most recently added), got %+v ok=%v", got, ok)
	}
	got, ok = r.RemoveNewest()
	if !ok || got != b2 {
		t.Fatalf("expected b2, got %+v ok=%v", got, ok)
	}
	got, ok = r.RemoveNewest()
	if !ok || got != b1 {
		t.Fatalf("expected b1, got %+v ok=%v", got, ok)
	}
}

func TestBotRegistry_RemoveNewestEmpty(t *testing.T) {
	r := NewBotRegistry()
	got, ok := r.RemoveNewest()
	if ok || got != nil {
		t.Fatalf("expected (nil, false) on empty registry, got (%+v, %v)", got, ok)
	}
}

func TestBotRegistry_ListPreservesInsertionOrder(t *testing.T) {
	r := NewBotRegistry()
	b1 := core.NewBot(r.NextBotID())
	b2 := core.NewBot(r.NextBotID())
	b3 := core.NewBot(r.NextBotID())
	r.Add(b1)
	r.Add(b2)
	r.Add(b3)

	list := r.List()
	want := []*core.Bot{b1, b2, b3}
	if len(list) != len(want) {
		t.Fatalf("expected %d bots, got %d", len(want), len(list))
	}
	for i, w := range want {
		if list[i] != w {
			t.Fatalf("position %d: expected bot ID %d, got %d", i, w.ID, list[i].ID)
		}
	}

	if r.Count() != 3 {
		t.Fatalf("expected Count()=3, got %d", r.Count())
	}
}
