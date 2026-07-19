// Command server runs the HTTP REST API for the McDonald's order controller.
package main

import (
	"log"
	"net/http"
	"os"

	adapterhttp "github.com/KhanitthaK/feedme-backend-service/internal/adapter/http"
	"github.com/KhanitthaK/feedme-backend-service/internal/usecase"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctrl := usecase.NewOrderController(usecase.NewRealClock(), usecase.DefaultProcessDuration)
	router := adapterhttp.NewRouter(ctrl)

	addr := ":" + port
	log.Printf("order-server listening on %s", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
