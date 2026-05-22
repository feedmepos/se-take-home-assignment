package domain

import (
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestBotScheduler_AddBot(t *testing.T) {
	scheduler := NewBotScheduler()

	bot1 := scheduler.AddBot()
	assert.NotNil(t, bot1)
	assert.Equal(t, uint64(1), bot1.ID)
	assert.Equal(t, Idle, bot1.Status)

	bot2 := scheduler.AddBot()
	assert.NotNil(t, bot2)
	assert.Equal(t, uint64(2), bot2.ID)
	assert.Equal(t, Idle, bot2.Status)

	status := scheduler.GetBotStatus()
	assert.Equal(t, 2, len(status))
	assert.Equal(t, "Idle", status[1])
	assert.Equal(t, "Idle", status[2])
}

func TestBotScheduler_RemoveBot(t *testing.T) {
	scheduler := NewBotScheduler()

	bot := scheduler.AddBot()
	assert.Equal(t, 1, len(scheduler.GetBotStatus()))

	removedBot, order := scheduler.RemoveBot()
	assert.NotNil(t, removedBot)
	assert.Nil(t, order)
	assert.Equal(t, bot.ID, removedBot.ID)
	assert.Equal(t, 0, len(scheduler.GetBotStatus()))
}

func TestBotScheduler_RemoveBot_WithProcessingOrder(t *testing.T) {
	scheduler := NewBotScheduler()

	bot := scheduler.AddBot()
	order := NewOrder(1, Normal)
	scheduler.SubmitOrder(order)

	time.Sleep(50 * time.Millisecond)

	removedBot, returnedOrder := scheduler.RemoveBot()
	assert.NotNil(t, removedBot)
	assert.NotNil(t, returnedOrder)
	assert.Equal(t, bot.ID, removedBot.ID)
	assert.Equal(t, order.ID, returnedOrder.ID)
	assert.Equal(t, OrderPending, returnedOrder.Status)

	pendingOrders := scheduler.GetPendingOrders()
	assert.Equal(t, 1, len(pendingOrders))
	assert.Equal(t, order.ID, pendingOrders[0].ID)
}

func TestBotScheduler_SubmitOrder_Normal(t *testing.T) {
	scheduler := NewBotScheduler()

	order := NewOrder(1, Normal)
	scheduler.SubmitOrder(order)

	pendingOrders := scheduler.GetPendingOrders()
	assert.Equal(t, 1, len(pendingOrders))
	assert.Equal(t, uint64(1), pendingOrders[0].ID)
	assert.Equal(t, Normal, pendingOrders[0].Type)
	assert.Equal(t, OrderPending, pendingOrders[0].Status)
}

func TestBotScheduler_SubmitOrder_VIP(t *testing.T) {
	scheduler := NewBotScheduler()

	order := NewOrder(1, VIP)
	scheduler.SubmitOrder(order)

	pendingOrders := scheduler.GetPendingOrders()
	assert.Equal(t, 1, len(pendingOrders))
	assert.Equal(t, uint64(1), pendingOrders[0].ID)
	assert.Equal(t, VIP, pendingOrders[0].Type)
	assert.Equal(t, OrderPending, pendingOrders[0].Status)
}

func TestBotScheduler_AutoAssign(t *testing.T) {
	scheduler := NewBotScheduler()
	bot := scheduler.AddBot()

	order := NewOrder(1, Normal)
	scheduler.SubmitOrder(order)

	time.Sleep(50 * time.Millisecond)

	status := scheduler.GetBotStatus()
	assert.Equal(t, "Processing", status[bot.ID])

	pendingOrders := scheduler.GetPendingOrders()
	assert.Equal(t, 0, len(pendingOrders))
}

func TestBotScheduler_VIPPriority(t *testing.T) {
	scheduler := NewBotScheduler()

	normalOrder := NewOrder(1, Normal)
	scheduler.SubmitOrder(normalOrder)

	vipOrder := NewOrder(2, VIP)
	scheduler.SubmitOrder(vipOrder)

	pendingOrders := scheduler.GetPendingOrders()
	assert.Equal(t, 2, len(pendingOrders))
	assert.Equal(t, uint64(2), pendingOrders[0].ID)
	assert.Equal(t, VIP, pendingOrders[0].Type)
	assert.Equal(t, uint64(1), pendingOrders[1].ID)
	assert.Equal(t, Normal, pendingOrders[1].Type)

	bot := scheduler.AddBot()
	time.Sleep(50 * time.Millisecond)

	status := scheduler.GetBotStatus()
	assert.Equal(t, "Processing", status[bot.ID])

	pendingOrders = scheduler.GetPendingOrders()
	assert.Equal(t, 1, len(pendingOrders))
	assert.Equal(t, uint64(1), pendingOrders[0].ID)
	assert.Equal(t, Normal, pendingOrders[0].Type)
}

func TestBotScheduler_Concurrent(t *testing.T) {
	scheduler := NewBotScheduler()

	var wg sync.WaitGroup
	numGoroutines := 10
	ordersPerGoroutine := 10

	wg.Add(numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			defer wg.Done()
			for j := 0; j < ordersPerGoroutine; j++ {
				orderID := uint64(id*ordersPerGoroutine + j + 1)
				orderType := Normal
				if j%2 == 0 {
					orderType = VIP
				}
				order := NewOrder(orderID, orderType)
				scheduler.SubmitOrder(order)
			}
		}(i)
	}
	wg.Wait()

	pendingOrders := scheduler.GetPendingOrders()
	assert.Equal(t, numGoroutines*ordersPerGoroutine, len(pendingOrders))

	for i := 0; i < 5; i++ {
		scheduler.AddBot()
	}

	status := scheduler.GetBotStatus()
	assert.Equal(t, 5, len(status))

	var wgRemove sync.WaitGroup
	wgRemove.Add(5)
	for i := 0; i < 5; i++ {
		go func() {
			defer wgRemove.Done()
			scheduler.RemoveBot()
		}()
	}
	wgRemove.Wait()

	status = scheduler.GetBotStatus()
	assert.Equal(t, 0, len(status))
}

func TestBotScheduler_ProcessLoop(t *testing.T) {
	scheduler := NewBotScheduler()

	originalProcessingTime := ProcessingTime
	defer func() {
		_ = originalProcessingTime
	}()

	bot := scheduler.AddBot()
	order := NewOrder(1, Normal)
	scheduler.SubmitOrder(order)

	time.Sleep(50 * time.Millisecond)

	status := scheduler.GetBotStatus()
	assert.Equal(t, "Processing", status[bot.ID])

	scheduler.checkAndProcess()

	completeOrders := scheduler.GetCompleteOrders()
	assert.Equal(t, 0, len(completeOrders))
}

func TestBotScheduler_GetCompleteOrders(t *testing.T) {
	scheduler := NewBotScheduler()

	order1 := NewOrder(1, Normal)
	order1.Status = OrderComplete
	scheduler.completeOrders = append(scheduler.completeOrders, order1)

	order2 := NewOrder(2, VIP)
	order2.Status = OrderComplete
	scheduler.completeOrders = append(scheduler.completeOrders, order2)

	completeOrders := scheduler.GetCompleteOrders()
	assert.Equal(t, 2, len(completeOrders))
	assert.Equal(t, uint64(1), completeOrders[0].ID)
	assert.Equal(t, uint64(2), completeOrders[1].ID)
}

func TestBotScheduler_RemoveBot_Empty(t *testing.T) {
	scheduler := NewBotScheduler()

	removedBot, order := scheduler.RemoveBot()
	assert.Nil(t, removedBot)
	assert.Nil(t, order)
}

func TestBotScheduler_MultipleBotsAssignment(t *testing.T) {
	scheduler := NewBotScheduler()

	bot1 := scheduler.AddBot()
	bot2 := scheduler.AddBot()

	order1 := NewOrder(1, Normal)
	order2 := NewOrder(2, Normal)
	scheduler.SubmitOrder(order1)
	scheduler.SubmitOrder(order2)

	time.Sleep(50 * time.Millisecond)

	status := scheduler.GetBotStatus()
	assert.Equal(t, "Processing", status[bot1.ID])
	assert.Equal(t, "Processing", status[bot2.ID])

	pendingOrders := scheduler.GetPendingOrders()
	assert.Equal(t, 0, len(pendingOrders))
}
