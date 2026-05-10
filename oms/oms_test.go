package oms_test

import (
	"context"
	"cs/oms"
	"sort"
	"testing"
	"time"
)

// case 1: first process two normal orders,
// then only processed all vip orders then start to process normal orders again
func Test_case1(t *testing.T) {
	var (
		ctx = context.Background()
		opc = oms.NewOrderPriorityCh(1000, ctx.Done())

		orderFlow  = oms.NewOrderFlow(ctx, opc)
		botManager = oms.NewBotManager(ctx, opc)
	)

	botManager.IncrBot()
	botManager.IncrBot()
	for range 4 {
		orderFlow.AddOrder(oms.OrderPriority_Normal)
	}
	time.Sleep(time.Second * 9)
	for range 2 {
		orderFlow.AddOrder(oms.OrderPriority_VIP)
	}

	orderFlow.Wait()

	fn := func(orders []*oms.Order) {
		sort.Slice(orders, func(i, j int) bool {
			idxi := len(orders[i].Stamps) - 1
			idxj := len(orders[j].Stamps) - 1
			return orders[i].Stamps[idxi].StartTime.Before(*orders[j].Stamps[idxj].StartTime)
		})
	}
	orders := orderFlow.GetOrders()
	fn(orders)

	// last two should be normal orders
	for i := range 2 {
		if orders[len(orders)-1-i].Priority != oms.OrderPriority_Normal {
			t.Fail()
		}
	}
}

// case 2: only after processed all vip orders, then start to process normal orders
func Test_case2(t *testing.T) {
	var (
		ctx = context.Background()
		opc = oms.NewOrderPriorityCh(1000, ctx.Done())

		orderFlow  = oms.NewOrderFlow(ctx, opc)
		botManager = oms.NewBotManager(ctx, opc)
	)

	ct := 5
	for range ct {
		orderFlow.AddOrder(oms.OrderPriority_Normal)
	}
	for range ct {
		orderFlow.AddOrder(oms.OrderPriority_VIP)
	}

	botManager.IncrBot()

	orderFlow.Wait()

	orders := orderFlow.GetOrders()
	fn(orders)

	// last ct should be normal orders
	for i := range ct {
		if orders[len(orders)-1-i].Priority != oms.OrderPriority_Normal {
			t.Fail()
		}
	}

}

// case 3: while one bot processing one normal order, a vip order added to order flow,
// after the processing order is completed, the bot should start to process vip order,
// then the bot manager decr bot, the bot is destoryed before the vip order can be completed,
// now there is one normal order and one vip order.
// after incr bot, one bot is avaliable, the bot should start to process vip order
func Test_case3(t *testing.T) {
	var (
		ctx = context.Background()
		opc = oms.NewOrderPriorityCh(1000, ctx.Done())

		orderFlow  = oms.NewOrderFlow(ctx, opc)
		botManager = oms.NewBotManager(ctx, opc)
	)

	botManager.IncrBot()
	for range 2 {
		orderFlow.AddOrder(oms.OrderPriority_Normal)
	}
	time.Sleep(time.Second * 5)

	orderFlow.AddOrder(oms.OrderPriority_VIP)
	time.Sleep(time.Second * 2)
	botManager.DecrBot()

	botManager.IncrBot()

	orderFlow.Wait()

	orders := orderFlow.GetOrders()
	fn(orders)
	// last one should be normal order
	if orders[len(orders)-1].Priority != oms.OrderPriority_Normal {
		t.Fail()
	}
}

func fn(orders []*oms.Order) {
	sort.Slice(orders, func(i, j int) bool {
		idxi := len(orders[i].Stamps) - 1
		idxj := len(orders[j].Stamps) - 1
		return orders[i].Stamps[idxi].StartTime.Before(*orders[j].Stamps[idxj].StartTime)
	})
}
