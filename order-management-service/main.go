package main

import (
	"order-management/handlers"
	"order-management/service"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	// CORS middleware to allow frontend on different origin to call API
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Authorization, Accept, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	m := service.NewManager()

	handlers.RegisterOrderRoutes(r, m)
	handlers.RegisterBotRoutes(r, m)

	r.Run(":8080")
}
