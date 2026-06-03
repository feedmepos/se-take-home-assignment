package order

import "testing"

func TestProcessPendingOrders(t *testing.T) {
	t.Run("idle bot picks vip order before normal order", func(t *testing.T) {
		controller := NewController()
		controller.AddNormalOrder()
		controller.AddVIPOrder()
		controller.AddBot()
		processingOrders := controller.processing
		processing := processingOrders[0]
		bot := controller.bots[0]

		got := processing.Kind
		want := VIP

		if got != want {
			t.Fatalf("got %v, want %v", got, want)
		}

		gotStatus := processing.Status
		wantStatus := Processing

		if gotStatus != wantStatus {
			t.Fatalf("got %v, want %v", gotStatus, wantStatus)
		}

		gotBotID := processing.BotID
		wantBotID := bot.ID

		if gotBotID != wantBotID {
			t.Fatalf("got %v, want %v", gotBotID, wantBotID)
		}

		gotBotState := bot.State
		wantBotState := Busy

		if gotBotState != wantBotState {
			t.Fatalf("got %v, want %v", gotBotState, wantBotState)
		}

		if len(processingOrders) != 1 {
			t.Fatalf("processing order count = %d; want 1", len(processingOrders))
		}
	})
}

func TestCompleteOrder(t *testing.T) {
	t.Run("moves processing order to completed queue", func(t *testing.T) {
		controller := NewController()
		controller.AddNormalOrder()
		controller.AddBot()
		controller.completeOrder(1)
		completedOrders := controller.completed
		completed := completedOrders[0]
		bot := controller.bots[0]

		got := completed.Status
		want := Complete

		if got != want {
			t.Fatalf("got %v, want %v", got, want)
		}

		gotBotID := completed.BotID
		wantBotID := 0

		if gotBotID != wantBotID {
			t.Fatalf("got %v, want %v", gotBotID, wantBotID)
		}

		gotBotState := bot.State
		wantBotState := Idle

		if gotBotState != wantBotState {
			t.Fatalf("got %v, want %v", gotBotState, wantBotState)
		}

		if len(completedOrders) != 1 {
			t.Fatalf("completed order count = %d; want 1", len(completedOrders))
		}

		if len(controller.processing) != 0 {
			t.Fatalf("processing order count = %d; want 0", len(controller.processing))
		}
	})

	t.Run("starts next pending order after completion", func(t *testing.T) {
		controller := NewController()
		controller.AddNormalOrder()
		controller.AddNormalOrder()
		controller.AddBot()
		controller.completeOrder(1)
		processingOrders := controller.processing
		processing := processingOrders[0]

		got := processing.ID
		want := 1002

		if got != want {
			t.Fatalf("got %v, want %v", got, want)
		}

		gotStatus := processing.Status
		wantStatus := Processing

		if gotStatus != wantStatus {
			t.Fatalf("got %v, want %v", gotStatus, wantStatus)
		}

		if len(processingOrders) != 1 {
			t.Fatalf("processing order count = %d; want 1", len(processingOrders))
		}
	})
}
