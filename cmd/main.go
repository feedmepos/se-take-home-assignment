package main

import (
	"main/internal/bot"
	"main/internal/logger"
	"main/internal/order"
	"time"
)

func main() {
	logger.Info("McDonald's Order Management System - Simulation Results")
	logger.Info("")

	orderController := order.NewOrderController()
	botManager := bot.NewBotManager(orderController)

	orderController.CreateOrder(order.Normal)
	orderController.CreateOrder(order.VIP)
	orderController.CreateOrder(order.Normal)

	time.Sleep(1 * time.Second)

	botManager.AddBot()
	time.Sleep(1 * time.Second)
	botManager.AddBot()

	time.Sleep(12 * time.Second)

	orderController.CreateOrder(order.VIP)
	time.Sleep(1 * time.Second)

	time.Sleep(12 * time.Second)

	botManager.RemoveBot()

	logger.Info("")
	logger.Info("Final Status:")
	logger.Info("- Total Orders Processed: %d (%d VIP, %d Normal)", orderController.GetCompletedOrdersCount(), orderController.GetCompletedOrdersCount(order.VIP), orderController.GetCompletedOrdersCount(order.Normal))
	logger.Info("- Orders Completed: %d", orderController.GetCompletedOrdersCount())
	logger.Info("- Active Bots: %d", botManager.GetActiveBotsCount())
	logger.Info("- Pending Orders: %d", orderController.GetPendingOrdersCount())
}
