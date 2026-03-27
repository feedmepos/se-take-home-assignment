package main

import (
	// "log"
	"fmt"
	"time"
	"se-take-home/service"
	// "se-take-home/handler"
	// "se-take-home/config"
	// "github.com/gin-gonic/gin"
)

func main() {
	fmt.Println(time.Now().Format("15:04:05"), "SE TAKE HOME CLI Start...")
	// 创建订单
	o1 := service.CreateOrder(1, 100, 12.5, false)
	fmt.Println(time.Now().Format("15:04:05"), "Create Normal Order:", o1.OrderNo)
	o2 := service.CreateOrder(2, 100, 88.8, true)
	fmt.Println(time.Now().Format("15:04:05"), "Create VIP Order:", o2.OrderNo)

	// 启动机器人
	rid := service.AddRobot()
	fmt.Println(time.Now().Format("15:04:05"), "Start Robot:", rid)
	// 等待订单完成
	time.Sleep(12 * time.Second)

	// config.InitDB()
	// r := gin.Default()
	// r.GET("/orders", handler.GetOrderList)
	// r.GET("/orders/pending", handler.GetPendingOrders)
	// r.GET("/orders/finished", handler.GetFinishedOrders)
	// r.POST("/orders", handler.CreateOrder)
	// r.POST("/robots/add", handler.AddRobot)
	// r.POST("/robots/remove", handler.RemoveRobot)
	// r.GET("/robots/count", handler.GetRobotCount)

	// // 静态文件路由使用/web前缀，避免与API冲突
	// r.StaticFS("/web", gin.Dir("./web", false))

	// log.Println("Server started at :8080")
	// r.Run(":8080")
}
