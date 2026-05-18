package restaurant

import (
	"testing"
	"time"
)

func TestVIPBeforeNormal(t *testing.T) {
	r := New(5 * time.Millisecond)
	r.NewNormalOrder()
	r.NewNormalOrder()
	r.NewVIPOrder()
	got := r.PendingSnapshot()
	if len(got) != 3 {
		t.Fatalf("pending len=%d want 3", len(got))
	}
	if got[0].Kind != VIP || got[0].ID != 3 {
		t.Errorf("first pending=%v want VIP#3", got[0])
	}
	if got[1].Kind != Normal || got[1].ID != 1 {
		t.Errorf("second pending=%v want N#1", got[1])
	}
	if got[2].Kind != Normal || got[2].ID != 2 {
		t.Errorf("third pending=%v want N#2", got[2])
	}
}

func TestVIPFIFOAmongVIP(t *testing.T) {
	r := New(5 * time.Millisecond)
	r.NewVIPOrder()
	r.NewVIPOrder()
	got := r.PendingSnapshot()
	if got[0].ID != 1 || got[1].ID != 2 {
		t.Fatalf("VIP order: %+v", got)
	}
}

func TestUniqueIncreasingIDs(t *testing.T) {
	r := New(time.Millisecond)
	a := r.NewNormalOrder()
	b := r.NewVIPOrder()
	c := r.NewNormalOrder()
	if a.ID >= b.ID || b.ID >= c.ID {
		t.Fatalf("ids not strictly increasing: %d %d %d", a.ID, b.ID, c.ID)
	}
}

func TestBotProcessesToComplete(t *testing.T) {
	r := New(15 * time.Millisecond)
	r.NewNormalOrder()
	r.AddBot()
	time.Sleep(100 * time.Millisecond)
	p := r.PendingSnapshot()
	c := r.CompletedSnapshot()
	if len(p) != 0 {
		t.Errorf("pending=%v want empty", p)
	}
	if len(c) != 1 || c[0].ID != 1 {
		t.Errorf("completed=%v want N#1", c)
	}
	r.Close()
}

func TestRemoveNewestBotRequeuesInProgress(t *testing.T) {
	r := New(200 * time.Millisecond)
	r.NewNormalOrder()
	r.NewNormalOrder()
	bid := r.AddBot()
	time.Sleep(20 * time.Millisecond)
	id, ok := r.RemoveNewestBot()
	if !ok || id != bid {
		t.Fatalf("RemoveNewestBot got id=%d ok=%v want id=%d", id, ok, bid)
	}
	time.Sleep(50 * time.Millisecond)
	p := r.PendingSnapshot()
	if len(p) != 2 {
		t.Fatalf("pending len=%d want 2 (both back): %+v", len(p), p)
	}
	if p[0].ID != 1 || p[1].ID != 2 {
		t.Errorf("pending order want N#1 N#2 got %+v", p)
	}
	r.Close()
}

func TestRemoveNewestLeavesOlderBot(t *testing.T) {
	r := New(30 * time.Millisecond)
	r.NewNormalOrder()
	r.NewNormalOrder()
	b1 := r.AddBot()
	b2 := r.AddBot()
	time.Sleep(15 * time.Millisecond)
	id, ok := r.RemoveNewestBot()
	if !ok || id != b2 {
		t.Fatalf("want remove bot %d got %d", b2, id)
	}
	time.Sleep(200 * time.Millisecond)
	r.Close()
	c := r.CompletedSnapshot()
	if len(c) != 2 {
		t.Errorf("completed=%v want 2 orders done by bot %d", c, b1)
	}
}
