package controller

import (
	"bytes"
	"context"
	"strings"
	"testing"
	"time"

	"feedme-order-controller/internal/usecase"
	"feedme-order-controller/internal/usecase/core"
)

// fakeOrderUsecase records the sequence of calls made against it so tests
// can assert the REPL parses input into the right sequence of usecase
// calls without depending on the real usecase implementation.
type fakeOrderUsecase struct {
	calls []string
}

func (f *fakeOrderUsecase) NewNormalOrder() core.Order {
	f.calls = append(f.calls, "order normal")
	return core.Order{ID: len(f.calls), Kind: core.Normal}
}

func (f *fakeOrderUsecase) NewVIPOrder() core.Order {
	f.calls = append(f.calls, "order vip")
	return core.Order{ID: len(f.calls), Kind: core.VIP}
}

func (f *fakeOrderUsecase) Status() core.Summary {
	f.calls = append(f.calls, "status")
	return core.Summary{}
}

// fakeBotUsecase records calls and lets a test force RemoveBot's error.
type fakeBotUsecase struct {
	calls          []string
	removeErr      error
	shutdownCalled bool
}

func (f *fakeBotUsecase) AddBot() *core.Bot {
	f.calls = append(f.calls, "bot add")
	return core.NewBot(len(f.calls))
}

func (f *fakeBotUsecase) RemoveBot() (*core.Bot, error) {
	f.calls = append(f.calls, "bot remove")
	if f.removeErr != nil {
		return nil, f.removeErr
	}
	return core.NewBot(1), nil
}

func (f *fakeBotUsecase) Shutdown() core.Summary {
	f.shutdownCalled = true
	return core.Summary{CompletedOrders: 3, VIPCompleted: 1, NormalCompleted: 2}
}

func TestRunInteractive_CommandSequence(t *testing.T) {
	orders := &fakeOrderUsecase{}
	bots := &fakeBotUsecase{}
	in := strings.NewReader("order normal\norder vip\nbot add\nstatus\nexit\n")
	var out, errOut bytes.Buffer

	if err := runInteractive(context.Background(), orders, bots, in, &out, &errOut); err != nil {
		t.Fatalf("runInteractive() error = %v", err)
	}

	wantOrderCalls := []string{"order normal", "order vip", "status"}
	if !equalStrings(orders.calls, wantOrderCalls) {
		t.Fatalf("orders.calls = %v, want %v", orders.calls, wantOrderCalls)
	}

	wantBotCalls := []string{"bot add"}
	if !equalStrings(bots.calls, wantBotCalls) {
		t.Fatalf("bots.calls = %v, want %v", bots.calls, wantBotCalls)
	}

	if !bots.shutdownCalled {
		t.Fatal("expected Shutdown() to be called on exit")
	}

	if !strings.Contains(out.String(), "Final Status:") {
		t.Fatalf("out = %q, want it to contain the final summary block", out.String())
	}
}

func TestRunInteractive_BotRemoveAliases(t *testing.T) {
	orders := &fakeOrderUsecase{}
	bots := &fakeBotUsecase{}
	in := strings.NewReader("bot +\nbot -\nexit\n")
	var out, errOut bytes.Buffer

	if err := runInteractive(context.Background(), orders, bots, in, &out, &errOut); err != nil {
		t.Fatalf("runInteractive() error = %v", err)
	}

	wantBotCalls := []string{"bot add", "bot remove"}
	if !equalStrings(bots.calls, wantBotCalls) {
		t.Fatalf("bots.calls = %v, want %v", bots.calls, wantBotCalls)
	}
}

func TestRunInteractive_UnknownCommandShowsHintAndContinues(t *testing.T) {
	orders := &fakeOrderUsecase{}
	bots := &fakeBotUsecase{}
	in := strings.NewReader("bogus\norder normal\nexit\n")
	var out, errOut bytes.Buffer

	if err := runInteractive(context.Background(), orders, bots, in, &out, &errOut); err != nil {
		t.Fatalf("runInteractive() error = %v", err)
	}

	if !strings.Contains(errOut.String(), usageHint) {
		t.Fatalf("errOut = %q, want it to contain the usage hint", errOut.String())
	}

	wantOrderCalls := []string{"order normal"}
	if !equalStrings(orders.calls, wantOrderCalls) {
		t.Fatalf("orders.calls = %v, want %v (unknown command must not stop the loop)", orders.calls, wantOrderCalls)
	}

	if !bots.shutdownCalled {
		t.Fatal("expected Shutdown() to be called on exit")
	}
}

func TestRunInteractive_ErrNoBotsFriendlyMessage(t *testing.T) {
	orders := &fakeOrderUsecase{}
	bots := &fakeBotUsecase{removeErr: usecase.ErrNoBots}
	in := strings.NewReader("bot remove\nexit\n")
	var out, errOut bytes.Buffer

	if err := runInteractive(context.Background(), orders, bots, in, &out, &errOut); err != nil {
		t.Fatalf("runInteractive() error = %v", err)
	}

	if strings.Contains(errOut.String(), "no bots to remove") == false {
		t.Fatalf("errOut = %q, want a friendly no-bots message", errOut.String())
	}
	if !bots.shutdownCalled {
		t.Fatal("expected Shutdown() to be called on exit")
	}
}

func TestRunInteractive_EOFTriggersShutdown(t *testing.T) {
	orders := &fakeOrderUsecase{}
	bots := &fakeBotUsecase{}
	// No "exit" line: stdin simply closes (EOF).
	in := strings.NewReader("order normal\n")
	var out, errOut bytes.Buffer

	if err := runInteractive(context.Background(), orders, bots, in, &out, &errOut); err != nil {
		t.Fatalf("runInteractive() error = %v", err)
	}

	if !bots.shutdownCalled {
		t.Fatal("expected Shutdown() to be called on EOF")
	}
	if !strings.Contains(out.String(), "Final Status:") {
		t.Fatalf("out = %q, want it to contain the final summary block", out.String())
	}
}

func TestRunInteractive_ContextCancelTriggersShutdown(t *testing.T) {
	orders := &fakeOrderUsecase{}
	bots := &fakeBotUsecase{}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	// Reader that never yields EOF/lines on its own; cancellation must be
	// what stops the loop.
	in := blockingReader{}
	var out, errOut bytes.Buffer

	done := make(chan error, 1)
	go func() { done <- runInteractive(ctx, orders, bots, in, &out, &errOut) }()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("runInteractive() error = %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("runInteractive() did not return after ctx cancellation")
	}

	if !bots.shutdownCalled {
		t.Fatal("expected Shutdown() to be called on ctx.Done()")
	}
}

// blockingReader never returns data or an error; it simulates a stdin that
// stays open indefinitely so the only way runInteractive can return is via
// ctx cancellation.
type blockingReader struct{}

func (blockingReader) Read(p []byte) (int, error) {
	select {}
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
