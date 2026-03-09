package router

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/hwakman/se-take-home-assignment/internal/api/handler"
	"github.com/hwakman/se-take-home-assignment/internal/service"
)

func SetupRouter(orderService *service.OrderService) *gin.Engine {
	r := gin.Default()

	// CORS configuration
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	orderHandler := handler.NewOrderHandler(orderService)
	botHandler := handler.NewBotHandler(orderService)

	api := r.Group("/api/v1")
	{
		orders := api.Group("/orders")
		{
			orders.POST("", orderHandler.CreateOrder)
			orders.GET("", orderHandler.GetAllOrders)
			orders.GET("/:id", orderHandler.GetOrder)
			orders.GET("/queue", orderHandler.GetQueue)
		}

		bots := api.Group("/bots")
		{
			bots.POST("", botHandler.ScaleBots)
			bots.GET("", botHandler.GetBots)
		}

		api.GET("/system/status", handler.NewSystemHandler(orderService).GetStatus)
	}

	return r
}
