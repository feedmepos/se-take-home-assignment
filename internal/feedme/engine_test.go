package feedme

import (
	"testing"
	"time"
)

func shortDur() time.Duration {
	return 20 * time.Millisecond
}

func TestAddOrderVIPBeforeNormal(t *testing.T) {
	e := NewEngine(shortDur())
	e.AddOrder(KindNormal) // id 1
	e.AddOrder(KindVIP)    // id 2
	st := e.Snapshot()
	if len(st.Pending) != 2 {
		t.Fatalf("pending len %d", len(st.Pending))
	}
	if st.Pending[0].ID != 2 || st.Pending[0].Kind != KindVIP {
		t.Fatalf("first pending want VIP#2, got %+v", st.Pending[0])
	}
	if st.Pending[1].ID != 1 {
		t.Fatalf("second pending want #1, got %+v", st.Pending[1])
	}
}

func TestProcessingOrderVIPFirst(t *testing.T) {
	e := NewEngine(shortDur())
	e.AddOrder(KindNormal)
	e.AddOrder(KindVIP)
	e.AddBot()
	deadline := time.Now().Add(500 * time.Millisecond)
	var st State
	for time.Now().Before(deadline) {
		st = e.Snapshot()
		if len(st.Complete) >= 1 {
			break
		}
		time.Sleep(2 * time.Millisecond)
	}
	if len(st.Complete) < 1 || st.Complete[0].ID != 2 {
		t.Fatalf("first completed should be VIP #2, complete %+v", st.Complete)
	}
	// #1 在首单刚完成时尚未进 COMPLETE
	if len(st.Complete) == 1 {
		if len(st.Pending)+len(st.Processing) == 0 {
			t.Fatal("order 1 missing")
		}
	}
}

func TestMultipleBotsDispatchOrder(t *testing.T) {
	e := NewEngine(shortDur())
	e.AddOrder(KindVIP)
	e.AddOrder(KindNormal)
	e.AddBot()
	e.AddBot()
	time.Sleep(shortDur() * 4)
	st := e.Snapshot()
	if len(st.Complete) != 2 {
		t.Fatalf("want 2 complete, got %+v", st.Complete)
	}
}

func TestRemoveNewestBotRequeuesProcessing(t *testing.T) {
	d := 200 * time.Millisecond
	e := NewEngine(d)
	e.AddOrder(KindNormal) // 1
	e.AddOrder(KindVIP)    // 2
	e.AddBot()
	// bot1 应处理 VIP #2
	time.Sleep(10 * time.Millisecond)
	st := e.Snapshot()
	if len(st.Processing) != 1 || st.Processing[0].ID != 2 {
		t.Fatalf("processing %+v", st.Processing)
	}
	if err := e.RemoveNewestBot(); err != nil {
		t.Fatal(err)
	}
	st = e.Snapshot()
	if len(st.Bots) != 0 {
		t.Fatalf("bots %+v", st.Bots)
	}
	// #2 回到 VIP pending 前、#1 仍在 normal
	if len(st.Pending) != 2 {
		t.Fatalf("pending %+v", st.Pending)
	}
	if st.Pending[0].ID != 2 {
		t.Fatalf("want VIP#2 first, got %+v", st.Pending[0])
	}
}

func TestRemoveNewestReinsertSortsByID(t *testing.T) {
	d := 200 * time.Millisecond
	e := NewEngine(d)
	e.AddOrder(KindNormal) // 1
	e.AddOrder(KindNormal) // 2
	e.AddBot()
	time.Sleep(10 * time.Millisecond)
	// bot 正在处理 #1
	if err := e.RemoveNewestBot(); err != nil {
		t.Fatal(err)
	}
	st := e.Snapshot()
	if len(st.Pending) != 2 {
		t.Fatalf("pending %+v", st.Pending)
	}
	if st.Pending[0].ID != 1 && st.Pending[0].ID != 2 {
		t.Fatalf("unexpected order %+v", st.Pending)
	}
	// id 升序：1 在 2 前
	if st.Pending[0].ID != 1 || st.Pending[1].ID != 2 {
		t.Fatalf("want [1,2] by id asc, got %+v", st.Pending)
	}
}

func TestRemoveNewestNoBot(t *testing.T) {
	e := NewEngine(shortDur())
	if err := e.RemoveNewestBot(); err != ErrNoBot {
		t.Fatalf("got %v", err)
	}
}

func TestAddOrderInvalidKind(t *testing.T) {
	e := NewEngine(shortDur())
	_, err := e.AddOrder(OrderKind("x"))
	if err != ErrInvalidKind {
		t.Fatalf("got %v", err)
	}
}

func TestIdleBotAfterDrain(t *testing.T) {
	e := NewEngine(shortDur())
	e.AddOrder(KindNormal)
	e.AddBot()
	time.Sleep(shortDur() * 3)
	st := e.Snapshot()
	if len(st.Complete) != 1 {
		t.Fatalf("complete %+v", st.Complete)
	}
	if len(st.Bots) != 1 || !st.Bots[0].Idle {
		t.Fatalf("bots %+v", st.Bots)
	}
}

func TestCancelVsCompleteRaceUsesCtx(t *testing.T) {
	// 长处理 + 取消：订单不应进入 COMPLETE
	d := 500 * time.Millisecond
	e := NewEngine(d)
	e.AddOrder(KindNormal)
	e.AddBot()
	time.Sleep(20 * time.Millisecond)
	if err := e.RemoveNewestBot(); err != nil {
		t.Fatal(err)
	}
	time.Sleep(d + 50*time.Millisecond)
	st := e.Snapshot()
	if len(st.Complete) != 0 {
		t.Fatalf("should not complete after cancel, got %+v", st.Complete)
	}
}
