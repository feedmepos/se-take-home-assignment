package domain

import "testing"

func TestVIPAppendIndex_AfterExistingVIP(t *testing.T) {
	tests := []struct {
		name    string
		vipLen  int
		wantIdx int
	}{
		{"empty VIP queue", 0, 0},
		{"one VIP ahead", 1, 1},
		{"three VIP ahead", 3, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := VIPAppendIndex(tt.vipLen); got != tt.wantIdx {
				t.Fatalf("VIPAppendIndex(%d) = %d, want %d", tt.vipLen, got, tt.wantIdx)
			}
		})
	}
}

func TestNormalAppendIndex_TailOfNormal(t *testing.T) {
	if got := NormalAppendIndex(0); got != 0 {
		t.Fatalf("got %d", got)
	}
	if got := NormalAppendIndex(5); got != 5 {
		t.Fatalf("got %d", got)
	}
}

// 新 VIP 应在所有已有 VIP 之后、相对 Normal 仍优先：体现在「出队」顺序上 — VIP 队列非空则永远先出 VIP。
func TestDequeuePeek_VIPBeforeNormal(t *testing.T) {
	fromVIP, ok := DequeuePeek(1, 99)
	if !ok || !fromVIP {
		t.Fatalf("expected VIP first when vipLen>0")
	}
	fromVIP, ok = DequeuePeek(0, 3)
	if !ok || fromVIP {
		t.Fatalf("expected Normal when no VIP")
	}
	fromVIP, ok = DequeuePeek(0, 0)
	if ok {
		t.Fatalf("expected empty")
	}
	_ = fromVIP
}

func TestRequeueInsertIndex_Clamp(t *testing.T) {
	if got := RequeueInsertIndex(2, 5); got != 2 {
		t.Fatalf("clamp high: got %d", got)
	}
	if got := RequeueInsertIndex(5, -1); got != 0 {
		t.Fatalf("clamp low: got %d", got)
	}
	if got := RequeueInsertIndex(10, 3); got != 3 {
		t.Fatalf("got %d", got)
	}
}
