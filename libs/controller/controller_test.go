package controller_test

import (
	"testing"
	"time"

	controllerpkg "github.com/jason0w0/se-take-home-assignment/libs/controller"
	"github.com/jason0w0/se-take-home-assignment/libs/order"
	"github.com/stretchr/testify/assert"
)

func TestVipOrderQueue(t *testing.T) {
	assert := assert.New(t)
	controller := controllerpkg.NewController()

	controller.AddNormalOrder()
	controller.AddVipOrder()
	controller.AddVipOrder()
	controller.AddNormalOrder()

	assert.Equal(order.VIP, controller.PendingQueue[0].OrderType, "VIP order should be place in front of normal order")
	assert.Equal(order.VIP, controller.PendingQueue[1].OrderType, "VIP order should be place in front of normal order")
	assert.Equal(order.Normal, controller.PendingQueue[2].OrderType, "Normal order should be place in behind of VIP order")
	assert.Equal(order.Normal, controller.PendingQueue[3].OrderType, "Normal order should be place in behind of VIP order")
}

func TestBotProcessOrderAddOrderFirst(t *testing.T) {
	controller := controllerpkg.NewController()

	controller.AddNormalOrder()
	controller.AddBot()

	time.Sleep(10*time.Second + 100*time.Millisecond)

	assert.Equal(t, 1, len(controller.CompletedQueue), "Bot should finish proccessing order after 10 seconds")
}

func TestBotProcessOrderAddBotFirst(t *testing.T) {
	controller := controllerpkg.NewController()

	controller.AddBot()
	controller.AddNormalOrder()

	time.Sleep(10*time.Second + 100*time.Millisecond)

	assert.Equal(t, 1, len(controller.CompletedQueue), "Bot should finish proccessing order after 10 seconds")
}

func TestBotProcessOrderAfterRemoveBot(t *testing.T) {
	controller := controllerpkg.NewController()

	controller.AddBot()
	controller.AddBot()
	controller.AddNormalOrder()
	controller.AddNormalOrder()
	controller.RemoveBot()

	time.Sleep(20*time.Second + 200*time.Millisecond)

	assert.Equal(t, 2, len(controller.CompletedQueue), "Bot should finish proccessing 2 orders after 20 seconds")
}

func TestMultipleBotProcessMultipleOrders(t *testing.T) {
	controller := controllerpkg.NewController()

	controller.AddBot()
	controller.AddBot()
	controller.AddNormalOrder()
	controller.AddNormalOrder()
	controller.AddNormalOrder()
	controller.AddNormalOrder()

	time.Sleep(20*time.Second + 200*time.Millisecond)

	assert.Equal(t, 4, len(controller.CompletedQueue), "2 Bot should finish proccessing 4 orders after 10 seconds")
}
