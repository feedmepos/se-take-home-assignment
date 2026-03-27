package controller

import (
	"fmt"
	"mcd/pkg/model/botManager"
	"mcd/pkg/model/orderManager"
	"sync"
)

type Controller struct {
	bm *botManager.BotManager
	om *orderManager.OrderManager
}

var (
	controllerInstance *Controller
	once               sync.Once
)

func Init() *Controller {
	once.Do(func() {
		om := orderManager.NewOrderManager()
		controllerInstance = &Controller{
			om: om,
			bm: botManager.NewBotManager(om),
		}
	})
	return controllerInstance
}

func (c *Controller) AddVIPOrder() {
	c.om.Add("VIP")
}

func (c *Controller) AddNormalOrder() {
	c.om.Add("Normal")
}

func (c *Controller) AddBot() {
	c.bm.Add()
}

func (c *Controller) DelBot() {
	c.bm.Del()
}

func (c *Controller) ListOrders() {
	c.om.List()
}

func (c *Controller) FinalStatus() {
	fmt.Printf("- Orders Completed: %d\n", len(c.om.CompletedOrder))
	fmt.Printf("- Active Bots: %d\n", c.bm.Len())
	fmt.Printf("- VIP Pending Orders: %d\n", len(c.om.VIPOrder))
	fmt.Printf("- Normal Pending Orders: %d\n", len(c.om.NormalOrder))

	c.om.List()
}
