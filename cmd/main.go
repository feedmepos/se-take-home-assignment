package main

import (
	"fmt"
	"time"

	"example.com/order-controller/pkg/controller"
)

func main() {
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println("")
	c := controller.Controller{}
	controller.Log("System initialized with 0 bots")
	// start simulation
	c.AddNormalOrder()
	c.AddVipOrder()
	c.AddNormalOrder()
	time.Sleep(1 * time.Second)
	c.AddBot()
	time.Sleep(1 * time.Second)
	c.AddBot()
	time.Sleep(12 * time.Second)
	c.AddVipOrder()
	time.Sleep(1 * time.Second)
	time.Sleep(12 * time.Second)
	c.RemoveBot()
	c.WaitUntilDone()
	c.PrintStatus()
}
