package sim

import "testing"

// go test ./internal/sim/ -v
// go test ./internal/sim/ -run TestAddBotNoPendingOrder -v
func TestAddBotNoPendingOrder(t *testing.T) {
	c := NewController(1001)
	bot := c.AddBot()

	if bot.Current != nil { //if bot has order assigned
		t.Error("bot should have no order")
	}
}

func TestAddBotPendingOrder(t *testing.T) {
	c := NewController(1001)
	order := c.CreateNormalOrder()
	bot := c.AddBot()

	if bot.Current == nil { //if current bot order is 0, test fail
		t.Error("bot should have an order")
	}

	if bot.Current.ID != order.ID {
		t.Errorf("expected order %d, got %d", order.ID, bot.Current.ID)
	}

	if len(c.PendingOrders()) != 0 {
		t.Error("pending orders should be empty")
	}
}

func TestAddBotPicksUpVIPOrderFirst(t *testing.T) {
	c := NewController(1001)
	c.CreateNormalOrder()          // ID 1001
	c.CreateNormalOrder()          // ID 1002
	vipOrder := c.CreateVIPOrder() // ID 1003
	bot := c.AddBot()

	if bot.Current == nil { //if current bot order is 0, test fail
		t.Error("bot should have an order")
	}

	if bot.Current.ID != vipOrder.ID {
		t.Errorf("expected bot pickup VIP order %d, but bot picked up order %d", vipOrder.ID, bot.Current.ID)
	}

	if len(c.PendingOrders()) != 2 {
		t.Errorf("expected 2 pending orders, got %d", len(c.PendingOrders()))
	}
}

func TestMultipleBotsTest(t *testing.T) {
	c := NewController(1001)
	c.CreateNormalOrder() // ID 1001
	c.CreateNormalOrder() // ID 1002
	c.CreateNormalOrder() // ID 1003

	bot1 := c.AddBot()
	bot2 := c.AddBot()

	if bot1.ID == bot2.ID {
		t.Errorf("both bot can have same order bot1: %d bot2: %d", bot1.ID, bot2.ID)
	}

	if bot1.Current.ID != 1001 {
		t.Errorf("bot1 expected to pick up order 1001")
	}

	if bot2.Current.ID != 1002 {
		t.Errorf("bot2 expected to pick up order 1002")
	}

	if len(c.PendingOrders()) != 1 {
		t.Errorf("should have pending orders")
	}
}

func TestTickCompletesOrder(t *testing.T) {
	c := NewController(1001)
	c.CreateNormalOrder()
	c.AddBot()

	// ticker 10 times (10s)
	for time := 0; time <= 10; time++ {
		c.Tick()
	}

	// check if order is completed
	if len(c.CompleteOrder()) != 1 {
		t.Errorf("expected 1 complete order, got %d", len(c.CompleteOrder()))
	}
}

func TestTickIdleBotPicksUpOrder(t *testing.T) {
	c := NewController(1001)
	c.CreateNormalOrder()                // ID 1001
	secondOrder := c.CreateNormalOrder() // ID 1002
	c.AddBot()

	// tick 11 times and finish order 1001 and bot go idle
	for time := 0; time <= 10; time++ {
		c.Tick()
	}

	// check if order finish
	if len(c.CompleteOrder()) != 1 {
		t.Errorf("expected 1 complete order, got %d", len(c.CompleteOrder()))
	}

	if len(c.PendingOrders()) != 0 {
		t.Errorf("expected 0 pending orders but got %d", len(c.PendingOrders()))
	}

	if c.bots[0].Current == nil {
		t.Error("bot should have picked up the second order")
	} else if c.bots[0].Current.ID != secondOrder.ID {
		t.Errorf("expected bot to pick up order %d, got %d", secondOrder.ID, c.bots[0].Current.ID)
	}
}

func TestRemoveBotReturnsOrderToPending(t *testing.T) {
	c := NewController(1001)
	firstOrder := c.CreateNormalOrder() // ID 1001
	bot := c.AddBot()

	if bot.Current.ID != firstOrder.ID {
		t.Errorf("bot should have picked up the first order but got %d", bot.Current.ID)
	}

	c.RemoveBot()

	if len(c.PendingOrders()) != 1 {
		t.Errorf("expected 1 pending order, got %d", len(c.PendingOrders()))
	}

	if c.PendingOrders()[0].ID != firstOrder.ID {
		t.Errorf("expected pending order %d, got %d", firstOrder.ID, c.PendingOrders()[0].ID)
	}

	if len(c.bots) != 0 {
		t.Errorf("expected 0 bots, got %d", len(c.bots))
	}

}
