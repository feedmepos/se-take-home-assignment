package service

import (
	"context"
	"testing"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/clock"
	"github.com/feedme/se-take-home-assignment/internal/domain"
	"github.com/feedme/se-take-home-assignment/internal/repository/memory"
)

func waitUntil(t *testing.T, pred func() bool) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		if pred() {
			return
		}
		time.Sleep(2 * time.Millisecond)
	}
	t.Fatal("timeout waiting condition")
}

func TestKitchen_OneBot_CompletesWithFakeClock(t *testing.T) {
	m := memory.NewMemory()
	k := NewKitchen(m, clock.FakeClock{}, WithCookDuration(time.Millisecond))
	_, err := k.CreateOrder(context.Background(), domain.TierNormal)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := k.AddBot(context.Background()); err != nil {
		t.Fatal(err)
	}
	waitUntil(t, func() bool {
		s, _ := k.Snapshot(context.Background())
		return len(s.Complete) == 1 && len(s.Pending) == 0
	})
}

func TestKitchen_TwoBots_NoDuplicateAssign(t *testing.T) {
	m := memory.NewMemory()
	k := NewKitchen(m, clock.FakeClock{}, WithCookDuration(5*time.Millisecond))
	for i := 0; i < 5; i++ {
		if _, err := k.CreateOrder(context.Background(), domain.TierNormal); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := k.AddBot(context.Background()); err != nil {
		t.Fatal(err)
	}
	if _, err := k.AddBot(context.Background()); err != nil {
		t.Fatal(err)
	}
	waitUntil(t, func() bool {
		s, _ := k.Snapshot(context.Background())
		return len(s.Complete) == 5
	})
}

func TestKitchen_RemoveBot_RequeuesPending(t *testing.T) {
	m := memory.NewMemory()
	k := NewKitchen(m, clock.RealClock{}, WithCookDuration(500*time.Millisecond))
	if _, err := k.CreateOrder(context.Background(), domain.TierVIP); err != nil {
		t.Fatal(err)
	}
	if _, err := k.AddBot(context.Background()); err != nil {
		t.Fatal(err)
	}
	time.Sleep(50 * time.Millisecond)
	if err := k.RemoveBot(context.Background()); err != nil {
		t.Fatal(err)
	}
	waitUntil(t, func() bool {
		s, _ := k.Snapshot(context.Background())
		return len(s.Pending) == 1 && len(s.Processing) == 0
	})
}

func TestKitchen_FailProcessing_GoesException(t *testing.T) {
	m := memory.NewMemory()
	k := NewKitchen(m, clock.RealClock{}, WithCookDuration(500*time.Millisecond))
	o, err := k.CreateOrder(context.Background(), domain.TierNormal)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := k.AddBot(context.Background()); err != nil {
		t.Fatal(err)
	}
	waitUntil(t, func() bool {
		s, _ := k.Snapshot(context.Background())
		return len(s.Processing) == 1
	})
	if err := k.FailProcessingOrder(context.Background(), o.ID); err != nil {
		t.Fatal(err)
	}
	waitUntil(t, func() bool {
		s, _ := k.Snapshot(context.Background())
		return len(s.Exception) == 1 && len(s.Processing) == 0
	})
	if err := k.RetryOrder(context.Background(), o.ID); err != nil {
		t.Fatal(err)
	}
	s, err := k.Snapshot(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(s.Pending) != 1 || s.Pending[0].Status != "pending" {
		t.Fatalf("retry: %#v", s.Pending)
	}
}
