package controller

import (
	"fmt"
	"sync"

	botpkg "github.com/jason0w0/se-take-home-assignment/libs/bot"
	orderpkg "github.com/jason0w0/se-take-home-assignment/libs/order"
	"github.com/jason0w0/se-take-home-assignment/libs/utils"
)

type Controller struct {
	Bots           []*botpkg.Bot
	PendingQueue   []*orderpkg.Order
	CompletedQueue []*orderpkg.Order

	mu sync.Mutex
	wg sync.WaitGroup
}

func NewController() *Controller {
	return &Controller{}
}

// AddNormalOrder append normal order to pending queue
func (controller *Controller) AddNormalOrder() {
	controller.mu.Lock()
	defer controller.mu.Unlock()

	normalOrder := orderpkg.NormalOrder()
	controller.PendingQueue = append(controller.PendingQueue, normalOrder)
	controller.wg.Add(1)
	utils.WriteToLog(fmt.Sprintf("Order %d has been added", normalOrder.ID))

	controller.assignOrderToBot()
}

// AddVipOrder insert vip order into the front of pending queue but behind existing VIP orders
func (controller *Controller) AddVipOrder() {
	controller.mu.Lock()
	defer controller.mu.Unlock()

	vipOrder := orderpkg.VIPOrder()

	pos := 0
	for i, order := range controller.PendingQueue {
		if order.OrderType == orderpkg.Normal {
			break
		}

		pos = i + 1
	}

	controller.PendingQueue = append(controller.PendingQueue, nil)
	copy(controller.PendingQueue[pos+1:], controller.PendingQueue[pos:])
	controller.PendingQueue[pos] = vipOrder
	controller.wg.Add(1)
	utils.WriteToLog(fmt.Sprintf("Order %d has been added", vipOrder.ID))

	controller.assignOrderToBot()
}

// assignOrderToBot finds an IDLE bot assign the order to it
func (controller *Controller) assignOrderToBot() {
	for _, bot := range controller.Bots {
		if bot.Status != botpkg.IDLE {
			continue
		}

		bot.Status = botpkg.BUSY
		bot.OrderChannel <- struct{}{}
		break
	}
}

// AddBot adds a bot to controller and starts the bot immediately
func (controller *Controller) AddBot() {
	controller.mu.Lock()
	defer controller.mu.Unlock()

	bot := botpkg.NewBot(controller)
	controller.Bots = append(controller.Bots, bot)

	go bot.Run()

	<-bot.ReadyChannel
	utils.WriteToLog("A bot has been added")
}

// RemoveBot stops the bot and remove it from controller
func (controller *Controller) RemoveBot() {
	controller.mu.Lock()
	defer controller.mu.Unlock()

	if len(controller.Bots) == 0 {
		return
	}

	bot := controller.Bots[len(controller.Bots)-1]
	close(bot.StopChannel)

	controller.Bots = controller.Bots[:len(controller.Bots)-1]
	utils.WriteToLog("A bot has been removed")
}

// GetNextOrder find the next pending order to be process, return nil if non
func (controller *Controller) GetNextOrder() *orderpkg.Order {
	controller.mu.Lock()
	defer controller.mu.Unlock()

	for _, order := range controller.PendingQueue {
		if order.Status == orderpkg.Pending {
			order.SetOrderProcessing()
			return order
		}
	}

	return nil
}

// SetOrderCompleted moves the order from pending queue to completed queue and mark it as complete
func (controller *Controller) SetOrderCompleted(orderID int) {
	controller.mu.Lock()
	defer controller.mu.Unlock()

	idx := 0
	for i, order := range controller.PendingQueue {
		if order.ID == orderID {
			order.SetOrderComplete()
			controller.CompletedQueue = append(controller.CompletedQueue, order)
			controller.wg.Done()
			utils.WriteToLog(fmt.Sprintf("Order %d has been completed", orderID))
			idx = i
			break
		}
	}

	controller.PendingQueue = append(controller.PendingQueue[:idx], controller.PendingQueue[idx+1:]...)
}

// SetOrderPending sets the order status to pending and try to assign the order to a bot.
// Called when a bot is stopped when processing an order.
func (controller *Controller) SetOrderPending(orderID int) {
	controller.mu.Lock()
	defer controller.mu.Unlock()

	for _, order := range controller.PendingQueue {
		if order.ID == orderID {
			order.SetOrderPending()
			controller.assignOrderToBot()
		}
	}
}

func (controller *Controller) WaitAllOrderToComplete() {
	controller.wg.Wait()
	utils.WriteToLog("Done")
}
