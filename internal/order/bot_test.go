package order

import "testing"

func TestAddBot(t *testing.T) {
	t.Run("adds idle bot to bots list", func(t *testing.T) {
		controller := NewController()
		controller.AddBot()
		bots := controller.bots
		bot := bots[0]

		got := bot.ID
		want := 1

		if got != want {
			t.Fatalf("got %v, want %v", got, want)
		}

		gotState := bot.State
		wantState := Idle

		if gotState != wantState {
			t.Fatalf("got %v, want %v", gotState, wantState)
		}

		if len(bots) != 1 {
			t.Fatalf("bot count = %d; want 1", len(bots))
		}
	})
}

func TestRemoveBot(t *testing.T) {
	t.Run("removes newest bot from bots list", func(t *testing.T) {
		controller := NewController()
		controller.AddBot()
		controller.AddBot()
		controller.RemoveBot()
		bots := controller.bots
		bot := bots[0]

		got := bot.ID
		want := 1

		if got != want {
			t.Fatalf("got %v, want %v", got, want)
		}

		if len(bots) != 1 {
			t.Fatalf("bot count = %d; want 1", len(bots))
		}
	})

	t.Run("returns processing order to pending queue", func(t *testing.T) {
		controller := NewController()
		controller.AddNormalOrder()
		controller.AddNormalOrder()
		controller.AddBot()
		controller.RemoveBot()
		pendingOrders := controller.pendingNormal
		pending := pendingOrders[0]

		got := pending.ID
		want := 1001

		if got != want {
			t.Fatalf("got %v, want %v", got, want)
		}

		gotStatus := pending.Status
		wantStatus := Pending

		if gotStatus != wantStatus {
			t.Fatalf("got %v, want %v", gotStatus, wantStatus)
		}

		gotBotID := pending.BotID
		wantBotID := 0

		if gotBotID != wantBotID {
			t.Fatalf("got %v, want %v", gotBotID, wantBotID)
		}

		if len(pendingOrders) != 2 {
			t.Fatalf("pending order count = %d; want 2", len(pendingOrders))
		}

		if len(controller.processing) != 0 {
			t.Fatalf("processing order count = %d; want 0", len(controller.processing))
		}
	})
}
