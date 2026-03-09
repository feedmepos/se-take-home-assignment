package main

import (
	"log"
	"net/http"

	"github.com/hwakman/se-take-home-assignment/internal/api/router"
	"github.com/hwakman/se-take-home-assignment/internal/service"
)

func main() {
	// Initialize services
	orderService := service.NewOrderService()

	// Setup router
	r := router.SetupRouter(orderService)

	// Start server
	log.Println("McDonald Orders API starting on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatalf("could not start server: %v", err)
	}
}
