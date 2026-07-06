package ordercontroller_test

import (
	"errors"
	"testing"

	"github.com/lijian-bj/se-take-home-assignment/internal/domain/ordercontroller"
)

func TestOrderController_PlaceOrdersAssignsMonotonicIDs(t *testing.T) {
	oc := ordercontroller.NewOrderController()

	n1 := oc.PlaceNormalOrder()
	n2 := oc.PlaceNormalOrder()
	v1 := oc.PlaceVIPOrder()

	if n1.ID != 1 || n2.ID != 2 || v1.ID != 3 {
		t.Fatalf("ids = %d,%d,%d want 1,2,3", n1.ID, n2.ID, v1.ID)
	}
	if got := oc.Pending().OrderIDs(); len(got) != 3 || got[0] != 3 {
		t.Fatalf("pending=%v want VIP first [3,1,2]", got)
	}
}

func TestOrderController_TryAssignOrder_EmptyQueue(t *testing.T) {
	oc := ordercontroller.NewOrderController()
	oc.AddBot()

	_, ok := oc.TryAssignOrder(1)
	if ok {
		t.Fatal("expected no assignment on empty queue")
	}
}

func TestOrderController_TryAssignOrder_BusyBot(t *testing.T) {
	oc := ordercontroller.NewOrderController()
	oc.PlaceNormalOrder()
	oc.PlaceNormalOrder()
	oc.AddBot()
	oc.TryAssignOrder(1)

	_, ok := oc.TryAssignOrder(1)
	if ok {
		t.Fatal("processing bot should not accept another order")
	}
}

func TestOrderController_CompleteOrder_ChainsNext(t *testing.T) {
	oc := ordercontroller.NewOrderController()
	oc.PlaceNormalOrder()
	oc.PlaceNormalOrder()
	oc.AddBot()
	oc.TryAssignOrder(1)

	completion, ok := oc.CompleteOrder(1)
	if !ok {
		t.Fatal("expected completion")
	}
	if completion.Order.ID != 1 || !completion.HasNext || completion.NextAssign == nil {
		t.Fatalf("expected chain to next order, got %+v", completion)
	}
	if completion.NextAssign.Order.ID != 2 {
		t.Fatalf("next order id=%d want 2", completion.NextAssign.Order.ID)
	}
}

func TestOrderController_CompleteOrder_SetsIdleWhenEmpty(t *testing.T) {
	oc := ordercontroller.NewOrderController()
	oc.PlaceNormalOrder()
	oc.AddBot()
	oc.TryAssignOrder(1)

	completion, ok := oc.CompleteOrder(1)
	if !ok || completion.HasNext {
		t.Fatalf("expected single completion without next, got %+v", completion)
	}
	if got := oc.CompleteIDs(); len(got) != 1 || got[0] != 1 {
		t.Fatalf("complete=%v want [1]", got)
	}

	snap := oc.Snapshot()
	if len(snap.Bots) != 1 || snap.Bots[0].State != ordercontroller.BotStateIdle {
		t.Fatalf("bot should be idle, got %+v", snap.Bots[0])
	}
}

func TestOrderController_LowestIdleBotID(t *testing.T) {
	oc := ordercontroller.NewOrderController()
	oc.AddBot()
	oc.AddBot()
	oc.PlaceNormalOrder()
	oc.TryAssignOrder(1)

	id, ok := oc.LowestIdleBotID()
	if !ok || id != 2 {
		t.Fatalf("lowest idle bot=%d ok=%v want 2", id, ok)
	}
}

func TestOrderController_IsFullyIdle(t *testing.T) {
	tests := []struct {
		name  string
		setup func(*ordercontroller.OrderController)
		want  bool
	}{
		{
			name:  "no bots no orders",
			setup: func(oc *ordercontroller.OrderController) {},
			want:  true,
		},
		{
			name: "pending orders",
			setup: func(oc *ordercontroller.OrderController) {
				oc.PlaceNormalOrder()
			},
			want: false,
		},
		{
			name: "processing bot",
			setup: func(oc *ordercontroller.OrderController) {
				oc.PlaceNormalOrder()
				oc.AddBot()
				oc.TryAssignOrder(1)
			},
			want: false,
		},
		{
			name: "idle bot no pending",
			setup: func(oc *ordercontroller.OrderController) {
				oc.AddBot()
			},
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			oc := ordercontroller.NewOrderController()
			tt.setup(oc)
			if got := oc.IsFullyIdle(); got != tt.want {
				t.Fatalf("IsFullyIdle()=%v want %v", got, tt.want)
			}
		})
	}
}

func TestOrderController_RemoveLatestBot_IdleBot(t *testing.T) {
	oc := ordercontroller.NewOrderController()
	oc.AddBot()
	oc.AddBot()

	removal, err := oc.RemoveLatestBot()
	if err != nil {
		t.Fatal(err)
	}
	if removal.BotID != 2 || removal.Interrupted != nil {
		t.Fatalf("expected idle removal of bot 2, got %+v", removal)
	}
	if len(oc.Snapshot().Bots) != 1 {
		t.Fatalf("expected 1 bot remaining")
	}
}

func TestOrderController_RemoveLatestBot_NoBots(t *testing.T) {
	oc := ordercontroller.NewOrderController()
	_, err := oc.RemoveLatestBot()
	if !errors.Is(err, ordercontroller.ErrNoBot) {
		t.Fatalf("expected ErrNoBot, got %v", err)
	}
}

func TestOrderController_SnapshotIsCopy(t *testing.T) {
	oc := ordercontroller.NewOrderController()
	oc.PlaceNormalOrder()
	oc.AddBot()
	oc.TryAssignOrder(1)

	snap := oc.Snapshot()
	snap.Complete = append(snap.Complete, ordercontroller.NewOrder(99, ordercontroller.OrderTypeNormal))

	if got := oc.CompleteIDs(); len(got) != 0 {
		t.Fatalf("mutating snapshot should not affect aggregate, complete=%v", got)
	}
}
