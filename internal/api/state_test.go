package api_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/Splinglove/se-take-home-assignment/internal/api"
	"github.com/Splinglove/se-take-home-assignment/internal/bot"
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
	"github.com/Splinglove/se-take-home-assignment/internal/order"
)

func TestBuildState_ProcessingFromBots(t *testing.T) {
	o1 := &order.Order{ID: 1, Type: order.TypeVIP, Status: order.StatusPending}
	o2 := &order.Order{ID: 2, Type: order.TypeNormal, Status: order.StatusProcessing}
	o3 := &order.Order{ID: 3, Type: order.TypeNormal, Status: order.StatusComplete}
	b1 := &bot.Bot{ID: 1, Status: bot.StatusProcessing, CurrentOrder: o2}
	b2 := &bot.Bot{ID: 2, Status: bot.StatusIdle, CurrentOrder: nil}

	st := api.BuildState(controller.Snapshot{
		Pending:  []*order.Order{o1},
		Complete: []*order.Order{o3},
		Bots:     []*bot.Bot{b1, b2},
	})

	if len(st.Pending) != 1 || st.Pending[0].ID != 1 {
		t.Fatalf("pending=%v", st.Pending)
	}
	if len(st.Processing) != 1 || st.Processing[0].ID != 2 || st.Processing[0].Status != "PROCESSING" {
		t.Fatalf("processing=%v", st.Processing)
	}
	if len(st.Complete) != 1 || st.Complete[0].ID != 3 {
		t.Fatalf("complete=%v", st.Complete)
	}
	if len(st.Bots) != 2 {
		t.Fatalf("bots len=%d", len(st.Bots))
	}
	if st.Bots[0].CurrentOrderID == nil || *st.Bots[0].CurrentOrderID != 2 {
		t.Fatalf("bot0 currentOrderId=%v", st.Bots[0].CurrentOrderID)
	}
	if st.Bots[1].CurrentOrderID != nil {
		t.Fatalf("bot1 should be idle, got %v", st.Bots[1].CurrentOrderID)
	}

	raw, err := json.Marshal(st)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]json.RawMessage
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"pending", "processing", "complete", "bots"} {
		if _, ok := m[key]; !ok {
			t.Fatalf("missing json key %q in %s", key, raw)
		}
	}
}

func TestBuildState_EmptySlicesNotNull(t *testing.T) {
	st := api.BuildState(controller.Snapshot{})
	raw, _ := json.Marshal(st)
	s := string(raw)
	for _, bad := range []string{`"pending":null`, `"processing":null`, `"complete":null`, `"bots":null`} {
		if strings.Contains(s, bad) {
			t.Fatalf("null slice in json: %s", s)
		}
	}
}
