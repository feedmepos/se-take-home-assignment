package main

import (
	"fmt"
	"time"

	"example.com/order-controller/pkg/controller"
)

func main() {
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println("")
	c := controller.NewController()
	controller.Log("System initialized with 0 bots")
	c.AddNormalOrder()
	c.AddVipOrder()
	c.AddNormalOrder()
	time.Sleep(1 * time.Second)
	c.AddBot()
	time.Sleep(1 * time.Second)
	c.AddBot()
	time.Sleep(10 * time.Second)
	c.AddVipOrder()
	time.Sleep(5 * time.Second)
	c.RemoveBot()
	c.WaitUntilDone()
	c.PrintStatus()
}
