package core

import "testing"

func TestBot_StopIsIdempotent(t *testing.T) {
	b := NewBot(1)

	// Calling Stop multiple times must not panic (sync.Once guards the
	// channel close).
	b.Stop()
	b.Stop()
	b.Stop()

	select {
	case <-b.StopCh:
		// expected: channel is closed.
	default:
		t.Fatal("expected StopCh to be closed after Stop()")
	}
}

func TestBot_SetProcessingAndCurrentRoundTrip(t *testing.T) {
	b := NewBot(1)

	if got := b.Current(); got != nil {
		t.Fatalf("new bot should be idle: Current() = %+v, want nil", got)
	}
	if b.Status() != Idle {
		t.Fatalf("new bot Status() = %v, want Idle", b.Status())
	}

	o := Order{ID: 42, Kind: VIP, Status: Processing}
	b.SetProcessing(o)

	got := b.Current()
	if got == nil {
		t.Fatal("Current() = nil after SetProcessing, want non-nil")
	}
	if *got != o {
		t.Fatalf("Current() = %+v, want %+v", *got, o)
	}
	if b.Status() != BotProcessing {
		t.Fatalf("Status() = %v, want BotProcessing", b.Status())
	}

	// Current() must return a copy: mutating it must not affect the bot's
	// internal state.
	got.ID = 999
	again := b.Current()
	if again.ID != 42 {
		t.Fatalf("Current() leaked internal pointer: got ID %d, want 42", again.ID)
	}

	b.SetIdle()
	if b.Current() != nil {
		t.Fatal("expected Current() = nil after SetIdle()")
	}
	if b.Status() != Idle {
		t.Fatalf("Status() = %v after SetIdle(), want Idle", b.Status())
	}
}
