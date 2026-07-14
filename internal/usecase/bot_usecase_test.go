package usecase_test

import (
	"errors"
	"testing"
	"time"

	"feedme-order-controller/internal/usecase"
)

func TestRemoveBot_RemovesNewest(t *testing.T) {
	u, _, bots := newTestUsecase(testProcessingTime)

	u.AddBot()
	u.AddBot()

	if got := bots.Count(); got != 2 {
		t.Fatalf("bots.Count() = %d, want 2", got)
	}

	removed, err := u.RemoveBot()
	if err != nil {
		t.Fatalf("RemoveBot() error = %v, want nil", err)
	}
	if removed.ID != 2 {
		t.Fatalf("removed bot ID = %d, want 2 (newest)", removed.ID)
	}

	remaining := bots.List()
	if len(remaining) != 1 {
		t.Fatalf("remaining bots = %d, want 1", len(remaining))
	}
	if remaining[0].ID != 1 {
		t.Fatalf("remaining bot ID = %d, want 1", remaining[0].ID)
	}
}

func TestRemoveBot_MidProcessing_OrderRequeued(t *testing.T) {
	// Use a longer processing time so we can reliably remove the bot while
	// it is still cooking the order.
	const longProcessing = 200 * time.Millisecond
	u, orders, _ := newTestUsecase(longProcessing)

	order := u.NewNormalOrder()
	bot := u.AddBot()

	// Wait until the bot has picked up the order (pending drained to 0).
	waitFor(t, time.Second, func() bool {
		return orders.PendingLen() == 0
	})
	if cur := bot.Current(); cur == nil || cur.ID != order.ID {
		t.Fatalf("expected bot to be processing order #%d, got %+v", order.ID, cur)
	}

	removed, err := u.RemoveBot()
	if err != nil {
		t.Fatalf("RemoveBot() error = %v, want nil", err)
	}
	if removed != bot {
		t.Fatalf("RemoveBot() returned a different bot than expected")
	}

	// <-bot.Done already happened inside RemoveBot, so the goroutine has
	// exited and the requeue must already be visible.
	if got := orders.PendingLen(); got != 1 {
		t.Fatalf("PendingLen() after mid-processing removal = %d, want 1 (order requeued)", got)
	}

	select {
	case <-bot.Done:
		// expected: goroutine has exited.
	default:
		t.Fatal("expected bot.Done to be closed after RemoveBot()")
	}
}

func TestRemoveBot_IdleBot_ReturnsPromptly(t *testing.T) {
	u, _, _ := newTestUsecase(testProcessingTime)

	bot := u.AddBot()
	// No orders created: bot should be idle, blocked in Dequeue.
	time.Sleep(5 * time.Millisecond)

	done := make(chan struct{})
	go func() {
		defer close(done)
		if _, err := u.RemoveBot(); err != nil {
			t.Errorf("RemoveBot() error = %v, want nil", err)
		}
	}()

	select {
	case <-done:
		// expected: returns promptly, no deadlock.
	case <-time.After(time.Second):
		t.Fatal("RemoveBot() on idle bot did not return within 1s (possible deadlock)")
	}

	select {
	case <-bot.Done:
	default:
		t.Fatal("expected bot.Done to be closed after RemoveBot()")
	}
}

func TestRemoveBot_ZeroBots_ReturnsErrNoBots(t *testing.T) {
	u, _, _ := newTestUsecase(testProcessingTime)

	_, err := u.RemoveBot()
	if !errors.Is(err, usecase.ErrNoBots) {
		t.Fatalf("RemoveBot() error = %v, want ErrNoBots", err)
	}
}

func TestShutdown_WaitGroupReturnsAndStopsAllBots(t *testing.T) {
	u, _, bots := newTestUsecase(testProcessingTime)

	u.AddBot()
	u.AddBot()
	u.NewNormalOrder()
	u.NewVIPOrder()

	done := make(chan struct{})
	go func() {
		defer close(done)
		u.Shutdown()
	}()

	select {
	case <-done:
		// expected: Shutdown (and its internal wg.Wait()) returns.
	case <-time.After(2 * time.Second):
		t.Fatal("Shutdown() did not return within 2s")
	}

	for _, b := range bots.List() {
		select {
		case <-b.Done:
			// expected: every bot's goroutine has exited.
		default:
			t.Fatalf("bot #%d Done not closed after Shutdown()", b.ID)
		}
	}
}
