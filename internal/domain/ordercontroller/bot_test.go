package ordercontroller_test

import (
	"testing"

	"github.com/lijian-bj/se-take-home-assignment/internal/domain/ordercontroller"
)

func TestBot_NewBotIsIdle(t *testing.T) {
	b := ordercontroller.NewBot(1)
	if !b.IsIdle() || b.IsProcessing() || !b.CanAcceptOrder() {
		t.Fatalf("new bot should be idle and accept orders, got state=%s", b.State)
	}
	if b.PickupIndex != -1 {
		t.Fatalf("pickup index=%d want -1", b.PickupIndex)
	}
}

func TestBot_StartProcessing(t *testing.T) {
	b := ordercontroller.NewBot(1)
	order := ordercontroller.NewOrder(42, ordercontroller.OrderTypeVIP)
	b.StartProcessing(order, 0)

	if !b.IsProcessing() || b.IsIdle() {
		t.Fatalf("processing bot state inconsistent: idle=%v processing=%v",
			b.IsIdle(), b.IsProcessing())
	}
	if b.CanAcceptOrder() {
		t.Fatal("processing bot with active order should not accept another")
	}
	if b.CurrentOrder == nil || b.CurrentOrder.ID != 42 || b.PickupIndex != 0 {
		t.Fatalf("current order=%+v pickupIndex=%d", b.CurrentOrder, b.PickupIndex)
	}
}

func TestBot_ClearProcessing(t *testing.T) {
	b := ordercontroller.NewBot(1)
	b.StartProcessing(ordercontroller.NewOrder(1, ordercontroller.OrderTypeNormal), 2)
	b.ClearProcessing()

	if b.CurrentOrder != nil || b.PickupIndex != -1 {
		t.Fatalf("after clear: order=%+v index=%d", b.CurrentOrder, b.PickupIndex)
	}
}

func TestBot_SetIdle(t *testing.T) {
	b := ordercontroller.NewBot(1)
	b.StartProcessing(ordercontroller.NewOrder(1, ordercontroller.OrderTypeNormal), 0)
	b.SetIdle()

	if !b.IsIdle() || b.IsProcessing() {
		t.Fatalf("bot should be idle after SetIdle, state=%s", b.State)
	}
	if b.CurrentOrder != nil {
		t.Fatal("SetIdle should clear current order")
	}
}
