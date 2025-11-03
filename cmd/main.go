package main

import (
	"time"

	"github.com/jason0w0/se-take-home-assignment/libs/controller"
)

func main() {
	controller := controller.NewController()

	controller.AddNormalOrder()
	controller.AddVipOrder()
	controller.AddNormalOrder()
	controller.AddVipOrder()
	controller.AddBot()
	controller.AddBot()

	time.Sleep(11 * time.Second)
	controller.RemoveBot()

	controller.AddVipOrder()
	controller.AddBot()

	controller.WaitAllOrderToComplete()
}
