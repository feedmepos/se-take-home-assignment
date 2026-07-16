package order

import (
	"testing"
	"time"
)

func testConfig() Config {
	return Config{ProcessDuration: 150 * time.Millisecond}
}

func newTestController() *Controller {
	return NewControllerWithConfig(testConfig())
}

func waitCook(t *testing.T) {
	t.Helper()
	time.Sleep(testConfig().ProcessDuration + 80*time.Millisecond)
}

func TestCreateNormalOrder(t *testing.T) {
	ctrl := NewController()
	order := ctrl.CreateNormalOrder()

	if order.ID != 1 || order.Type != Normal || ctrl.OrderStatus(order) != StatusPending {
		t.Fatalf("unexpected order: %+v", order)
	}
	if ctrl.GetTotalOrdersCreated() != 1 || ctrl.GetPendingOrderCount() != 1 {
		t.Fatalf("unexpected counts: created=%d pending=%d",
			ctrl.GetTotalOrdersCreated(), ctrl.GetPendingOrderCount())
	}
}

func TestVIPOrderPriority(t *testing.T) {
	ctrl := NewController()
	n1 := ctrl.CreateNormalOrder()
	v1 := ctrl.CreateVIPOrder()
	n2 := ctrl.CreateNormalOrder()
	v2 := ctrl.CreateVIPOrder()

	want := []int{v1.ID, v2.ID, n1.ID, n2.ID}
	got := ctrl.PendingIDs()
	if len(got) != len(want) {
		t.Fatalf("pending=%v want=%v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("pending=%v want=%v", got, want)
		}
	}
}

func TestAddBot(t *testing.T) {
	ctrl := NewController()
	bot := ctrl.AddBot()
	st, _ := ctrl.BotState(bot)
	if bot.ID != 1 || st != Idle || ctrl.GetActiveBotCount() != 1 {
		t.Fatalf("unexpected bot: %+v count=%d", bot, ctrl.GetActiveBotCount())
	}
}

func TestBotProcessesOrder(t *testing.T) {
	ctrl := newTestController()
	order := ctrl.CreateNormalOrder()
	bot := ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	st, cur := ctrl.BotState(bot)
	if st != Processing || cur == nil || cur.ID != order.ID {
		t.Fatalf("bot should process order #%d", order.ID)
	}
	if ctrl.OrderStatus(order) != StatusProcessing || ctrl.GetPendingOrderCount() != 0 {
		t.Fatalf("order should be PROCESSING and leave pending")
	}

	waitCook(t)
}

func TestRemoveBotNewest(t *testing.T) {
	ctrl := NewController()
	bot1 := ctrl.AddBot()
	bot2 := ctrl.AddBot()
	removed := ctrl.RemoveBot()
	if removed.ID != bot2.ID || ctrl.GetActiveBotCount() != 1 {
		t.Fatalf("should remove newest bot")
	}
	if ctrl.RemainingBotIDs()[0] != bot1.ID {
		t.Fatalf("bot1 should remain")
	}
}

func TestRemoveBotWhileProcessing(t *testing.T) {
	ctrl := newTestController()
	order := ctrl.CreateNormalOrder()
	ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	ctrl.RemoveBot()
	if ctrl.GetPendingOrderCount() != 1 {
		t.Fatalf("interrupted order should return to pending")
	}
	if ctrl.PendingIDs()[0] != order.ID || ctrl.OrderStatus(order) != StatusPending {
		t.Fatalf("order should be PENDING again")
	}
}

func TestOrderCompletion(t *testing.T) {
	ctrl := newTestController()
	order := ctrl.CreateNormalOrder()
	ctrl.AddBot()
	waitCook(t)

	if ctrl.GetCompletedOrderCount() != 1 || ctrl.OrderStatus(order) != StatusComplete {
		t.Fatalf("order should complete")
	}
}

func TestEmptyQueueBotStaysIdle(t *testing.T) {
	ctrl := NewController()
	bot := ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)
	st, cur := ctrl.BotState(bot)
	if st != Idle || cur != nil {
		t.Fatalf("bot should stay idle without orders")
	}
}

func TestQueueEnqueueVIP(t *testing.T) {
	q := NewQueue()
	n := &Order{ID: 1, Type: Normal}
	v := &Order{ID: 2, Type: VIP}
	q.EnqueueNormal(n)
	q.EnqueueVIP(v)
	if q.IDs()[0] != 2 || q.IDs()[1] != 1 {
		t.Fatalf("VIP should be ahead, got %v", q.IDs())
	}
}
