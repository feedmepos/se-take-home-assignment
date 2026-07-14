package controller

import (
	"reflect"
	"testing"

	"feedme-order-controller/internal/core"
	"feedme-order-controller/internal/handler/dto"
)

func TestToStatusResponse(t *testing.T) {
	summary := core.Summary{
		CompletedOrders: 2,
		Pending: []core.Order{
			{ID: 3, Kind: core.KindVIP, Status: core.StatusPending},
			{ID: 1, Kind: core.KindNormal, Status: core.StatusPending},
		},
		Bots: []core.BotSnapshot{
			{ID: 1, Status: core.BotProcessing, ProcessingOrderID: 3},
			{ID: 2, Status: core.BotIdle},
		},
	}

	got := toStatusResponse(summary)
	want := dto.StatusResponse{
		Pending: []dto.OrderView{
			{ID: 3, Type: "VIP", Status: "PENDING"},
			{ID: 1, Type: "Normal", Status: "PENDING"},
		},
		Bots: []dto.BotView{
			{ID: 1, Status: "PROCESSING", ProcessingOrderID: 3},
			{ID: 2, Status: "IDLE", ProcessingOrderID: 0},
		},
		CompletedCount: 2,
	}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("toStatusResponse() = %+v, want %+v", got, want)
	}
}

func TestToStatusResponse_EmptyState(t *testing.T) {
	got := toStatusResponse(core.Summary{})
	if len(got.Pending) != 0 || len(got.Bots) != 0 || got.CompletedCount != 0 {
		t.Fatalf("toStatusResponse(zero value) = %+v, want empty slices and zero count", got)
	}
}

func TestToSummaryResponse(t *testing.T) {
	summary := core.Summary{
		ActiveBots:      2,
		PendingOrders:   1,
		CompletedOrders: 4,
		VIPCompleted:    2,
		NormalCompleted: 2,
	}

	got := toSummaryResponse(summary)
	want := dto.SummaryResponse{
		ActiveBots:      2,
		PendingOrders:   1,
		CompletedOrders: 4,
		VIPCompleted:    2,
		NormalCompleted: 2,
	}

	if got != want {
		t.Fatalf("toSummaryResponse() = %+v, want %+v", got, want)
	}
}
