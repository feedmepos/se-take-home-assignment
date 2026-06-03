package order

import "testing"

func TestPendingOrders(t *testing.T) {
	t.Run("shows vip orders before normal orders", func(t *testing.T) {
		controller := NewController()

		controller.AddNormalOrder()
		controller.AddNormalOrder()
		controller.AddVIPOrder()

		pendingOrders := controller.pendingOrders()

		got := pendingOrders[0].Kind
		want := VIP

		if got != want {
			t.Fatalf("got %v, want %v", got, want)
		}

		got = pendingOrders[1].Kind
		want = Normal

		if got != want {
			t.Fatalf("got %v, want %v", got, want)
		}

		got = pendingOrders[2].Kind
		want = Normal

		if got != want {
			t.Fatalf("got %v, want %v", got, want)
		}

		if len(pendingOrders) != 3 {
			t.Fatalf("pending order count = %d; want 3", len(pendingOrders))
		}
	})
}

func TestAddNormalOrder(t *testing.T) {
	t.Run("adds normal order to pending queue", func(t *testing.T) {
		controller := NewController()
		controller.AddNormalOrder()
		pendingOrders := controller.pendingNormal
		pending := pendingOrders[0]

		got := pending.Kind
		want := Normal

		if got != want {
			t.Fatalf("got %v, want %v", got, want)
		}

		if len(pendingOrders) != 1 {
			t.Fatalf("pending order count = %d; want 1", len(pendingOrders))
		}
	})
}

func TestAddVIPOrder(t *testing.T) {
	t.Run("adds vip order to vip queue", func(t *testing.T) {
		controller := NewController()
		controller.AddVIPOrder()
		pendingOrders := controller.pendingVIP
		pending := pendingOrders[0]

		got := pending.Kind
		want := VIP

		if got != want {
			t.Fatalf("got %v, want %v", got, want)
		}

		if len(pendingOrders) != 1 {
			t.Fatalf("pending order count = %d; want 1", len(pendingOrders))
		}
	})
}
