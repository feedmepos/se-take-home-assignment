package ordercontroller_test

import (
	"errors"
	"testing"
	"time"

	app "github.com/lijian-bj/se-take-home-assignment/internal/application/ordercontroller"
	"github.com/lijian-bj/se-take-home-assignment/internal/domain/ordercontroller"
	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/clock"
	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/logging"
)

func newTestService(t *testing.T) (*app.Service, *clock.Mock) {
	t.Helper()
	clk := clock.NewMock(time.Date(2026, 7, 6, 9, 0, 0, 0, time.UTC))
	log := logging.NewDiscard(clk)
	svc := app.NewService(clk, log, 10*time.Second)
	svc.Start()
	return svc, clk
}

func completeIDs(svc *app.Service) []int {
	snap := svc.Status()
	ids := make([]int, len(snap.Complete))
	for i, o := range snap.Complete {
		ids[i] = o.ID
	}
	return ids
}

func pendingIDs(svc *app.Service) []int {
	return svc.Status().Pending.OrderIDs()
}

func botCount(svc *app.Service) int {
	return len(svc.Status().Bots)
}

func processingOrderID(svc *app.Service, botID int) (int, bool) {
	for _, b := range svc.Status().Bots {
		if b.ID == botID && b.State == ordercontroller.BotStateProcessing && b.CurrentOrder != nil {
			return b.CurrentOrder.ID, true
		}
	}
	return 0, false
}

func TestSingleBotSingleOrder(t *testing.T) {
	svc, clk := newTestService(t)
	svc.CreateNormalOrder()
	svc.AddBot()
	clk.Advance(10 * time.Second)

	if got := completeIDs(svc); len(got) != 1 || got[0] != 1 {
		t.Fatalf("complete = %v, want [1]", got)
	}
	if len(pendingIDs(svc)) != 0 {
		t.Fatalf("pending = %v, want empty", pendingIDs(svc))
	}
}

func TestVIPPreemptsNormal(t *testing.T) {
	svc, clk := newTestService(t)
	svc.CreateNormalOrder()
	svc.CreateVIPOrder()
	svc.AddBot()

	if id, ok := processingOrderID(svc, 1); !ok || id != 2 {
		t.Fatalf("bot should process VIP #2 first, got id=%d ok=%v", id, ok)
	}

	clk.Advance(10 * time.Second)
	clk.Advance(10 * time.Second)

	if got := completeIDs(svc); len(got) != 2 || got[0] != 2 || got[1] != 1 {
		t.Fatalf("complete=%v want [2,1]", got)
	}
}

func TestDualVIPFIFO(t *testing.T) {
	svc, clk := newTestService(t)
	svc.CreateVIPOrder()
	svc.CreateVIPOrder()
	svc.AddBot()
	clk.Advance(10 * time.Second)
	clk.Advance(10 * time.Second)

	if got := completeIDs(svc); len(got) != 2 || got[0] != 1 || got[1] != 2 {
		t.Fatalf("complete=%v want [1,2]", got)
	}
}

func TestAddBotConsumesPending(t *testing.T) {
	svc, _ := newTestService(t)
	svc.CreateNormalOrder()
	svc.CreateNormalOrder()
	svc.AddBot()

	if id, ok := processingOrderID(svc, 1); !ok || id != 1 {
		t.Fatalf("bot should immediately process #1, got id=%d", id)
	}
}

func TestRemoveIdleBot(t *testing.T) {
	svc, _ := newTestService(t)
	svc.AddBot()
	svc.AddBot()
	if err := svc.RemoveBot(); err != nil {
		t.Fatal(err)
	}
	if botCount(svc) != 1 {
		t.Fatalf("expected 1 bot, got %d", botCount(svc))
	}
}

func TestRemoveProcessingBotReinsert(t *testing.T) {
	svc, clk := newTestService(t)
	svc.CreateVIPOrder()
	svc.CreateNormalOrder()
	svc.CreateNormalOrder()
	svc.AddBot()
	clk.Advance(4 * time.Second)
	if err := svc.RemoveBot(); err != nil {
		t.Fatal(err)
	}

	if got := pendingIDs(svc); len(got) != 3 || got[0] != 1 {
		t.Fatalf("pending=%v want [1,2,3]", got)
	}
	if len(completeIDs(svc)) != 0 {
		t.Fatalf("complete should be empty")
	}
}

func TestReprocessAfterReinsert(t *testing.T) {
	svc, clk := newTestService(t)
	svc.CreateVIPOrder()
	svc.AddBot()
	clk.Advance(4 * time.Second)
	_ = svc.RemoveBot()
	svc.AddBot()
	clk.Advance(10 * time.Second)

	if got := completeIDs(svc); len(got) != 1 || got[0] != 1 {
		t.Fatalf("complete=%v want [1]", got)
	}
}

func TestDualBotConcurrentPickup(t *testing.T) {
	svc, _ := newTestService(t)
	svc.CreateVIPOrder()
	svc.CreateNormalOrder()
	svc.CreateNormalOrder()
	svc.AddBot()
	svc.AddBot()

	id1, _ := processingOrderID(svc, 1)
	id2, _ := processingOrderID(svc, 2)
	if id1 != 1 || id2 != 2 {
		t.Fatalf("expected bot1->#1 bot2->#2, got %d and %d", id1, id2)
	}
}

func TestRemoveLatestDoesNotAffectOther(t *testing.T) {
	svc, _ := newTestService(t)
	svc.CreateNormalOrder()
	svc.CreateNormalOrder()
	svc.AddBot()
	svc.AddBot()
	if err := svc.RemoveBot(); err != nil {
		t.Fatal(err)
	}
	if id, ok := processingOrderID(svc, 1); !ok || id != 1 {
		t.Fatalf("bot1 should still process #1")
	}
}

func TestOrderIDMonotonic(t *testing.T) {
	svc, _ := newTestService(t)
	o1, _ := svc.CreateNormalOrder()
	o2, _ := svc.CreateNormalOrder()
	o3, _ := svc.CreateVIPOrder()
	if o1.ID != 1 || o2.ID != 2 || o3.ID != 3 {
		t.Fatalf("ids = %d,%d,%d want 1,2,3", o1.ID, o2.ID, o3.ID)
	}
}

func TestFirstOrderIDIsOne(t *testing.T) {
	svc, _ := newTestService(t)
	o, _ := svc.CreateNormalOrder()
	if o.ID != 1 {
		t.Fatalf("first order id=%d want 1", o.ID)
	}
}

func TestRemoveBotWithNoBots(t *testing.T) {
	svc, _ := newTestService(t)
	err := svc.RemoveBot()
	if !errors.Is(err, ordercontroller.ErrNoBot) {
		t.Fatalf("expected ErrNoBot, got %v", err)
	}
}

func TestNewOrderWakesIdleBot(t *testing.T) {
	svc, _ := newTestService(t)
	svc.AddBot()
	svc.CreateNormalOrder()
	if id, ok := processingOrderID(svc, 1); !ok || id != 1 {
		t.Fatalf("idle bot should pick up new order")
	}
}

func TestCompletionChainsToNextOrder(t *testing.T) {
	svc, clk := newTestService(t)
	svc.CreateNormalOrder()
	svc.CreateNormalOrder()
	svc.AddBot()
	clk.Advance(10 * time.Second)

	if got := completeIDs(svc); len(got) != 1 || got[0] != 1 {
		t.Fatalf("after first completion complete=%v want [1]", got)
	}
	if id, ok := processingOrderID(svc, 1); !ok || id != 2 {
		t.Fatalf("bot should chain to order #2, got id=%d ok=%v", id, ok)
	}

	clk.Advance(10 * time.Second)
	if got := completeIDs(svc); len(got) != 2 || got[1] != 2 {
		t.Fatalf("complete=%v want [1,2]", got)
	}
}

func TestWaitUntilIdle_Success(t *testing.T) {
	svc, _ := newTestService(t)
	if err := svc.WaitUntilIdle(100 * time.Millisecond); err != nil {
		t.Fatal(err)
	}

	svc.CreateNormalOrder()
	svc.AddBot()
	if err := svc.WaitUntilIdle(15 * time.Second); err != nil {
		t.Fatalf("expected idle after processing, got %v", err)
	}
	if len(completeIDs(svc)) != 1 {
		t.Fatalf("order should be complete")
	}
}

func TestWaitUntilIdle_Timeout(t *testing.T) {
	svc, _ := newTestService(t)
	svc.CreateNormalOrder()
	svc.AddBot()

	err := svc.WaitUntilIdle(1 * time.Millisecond)
	if err == nil {
		t.Fatal("expected timeout when order still processing")
	}
}

func TestShutdownStopsTimers(t *testing.T) {
	svc, clk := newTestService(t)
	svc.CreateNormalOrder()
	svc.AddBot()
	svc.Shutdown()
	clk.Advance(10 * time.Second)

	if len(completeIDs(svc)) != 0 {
		t.Fatalf("shutdown should cancel timers, complete=%v", completeIDs(svc))
	}
}

func TestRemoveBotStopsTimer(t *testing.T) {
	svc, clk := newTestService(t)
	svc.CreateNormalOrder()
	svc.AddBot()
	if err := svc.RemoveBot(); err != nil {
		t.Fatal(err)
	}
	clk.Advance(10 * time.Second)

	if len(completeIDs(svc)) != 0 {
		t.Fatalf("removed bot timer should not complete order, complete=%v", completeIDs(svc))
	}
	if got := pendingIDs(svc); len(got) != 1 || got[0] != 1 {
		t.Fatalf("order should return to pending, got %v", got)
	}
}

func TestStartIsIdempotent(t *testing.T) {
	svc, _ := newTestService(t)
	svc.Start()
	svc.Start()
}

func TestLogStatus(t *testing.T) {
	svc, _ := newTestService(t)
	svc.CreateNormalOrder()
	svc.LogStatus()
}
