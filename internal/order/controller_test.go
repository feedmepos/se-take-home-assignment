package order

import (
	"reflect"
	"testing"
)

func TestVIPOrdersAreQueuedBeforeNormalOrders(t *testing.T) {
	c := NewController()
	normal1 := c.AddOrder(Normal)
	vip1 := c.AddOrder(VIP)
	normal2 := c.AddOrder(Normal)
	vip2 := c.AddOrder(VIP)

	want := []int{vip1, vip2, normal1, normal2}
	if got := c.PendingIDs(); !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order = %v, want %v", got, want)
	}
}

func TestBotProcessesOneOrderEveryTenSeconds(t *testing.T) {
	c := NewController()
	vip := c.AddOrder(VIP)
	normal := c.AddOrder(Normal)
	c.AddBot()

	if got := c.PendingIDs(); !reflect.DeepEqual(got, []int{normal}) {
		t.Fatalf("pending after pickup = %v, want [%d]", got, normal)
	}

	c.Advance(9)
	if got := c.CompletedIDs(); len(got) != 0 {
		t.Fatalf("completed after 9 seconds = %v, want none", got)
	}

	c.Advance(1)
	if got := c.CompletedIDs(); !reflect.DeepEqual(got, []int{vip}) {
		t.Fatalf("completed after 10 seconds = %v, want [%d]", got, vip)
	}
	if got := c.PendingIDs(); len(got) != 0 {
		t.Fatalf("pending after next pickup = %v, want none", got)
	}

	c.Advance(10)
	if got := c.CompletedIDs(); !reflect.DeepEqual(got, []int{vip, normal}) {
		t.Fatalf("completed after 20 seconds = %v, want [%d %d]", got, vip, normal)
	}
}

func TestRemovingNewestProcessingBotReturnsOrderToPriorityQueue(t *testing.T) {
	c := NewController()
	normal1 := c.AddOrder(Normal)
	normal2 := c.AddOrder(Normal)
	c.AddBot()
	c.AddBot()
	vip := c.AddOrder(VIP)

	c.RemoveBot()

	want := []int{vip, normal2}
	if got := c.PendingIDs(); !reflect.DeepEqual(got, want) {
		t.Fatalf("pending after removing newest bot = %v, want %v", got, want)
	}

	c.Advance(10)
	if got := c.CompletedIDs(); !reflect.DeepEqual(got, []int{normal1}) {
		t.Fatalf("completed = %v, want [%d]", got, normal1)
	}
}

func TestIdleBotImmediatelyPicksUpNewOrder(t *testing.T) {
	c := NewController()
	c.AddBot()
	orderID := c.AddOrder(Normal)

	if got := c.PendingIDs(); len(got) != 0 {
		t.Fatalf("pending = %v, want none because idle bot should pick it up", got)
	}
	c.Advance(10)
	if got := c.CompletedIDs(); !reflect.DeepEqual(got, []int{orderID}) {
		t.Fatalf("completed = %v, want [%d]", got, orderID)
	}
}
