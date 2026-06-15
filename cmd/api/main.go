package main

import (
	"log"
	"net/http"
	"os"

	"github.com/feedme/order-controller/internal/api"
)

func main() {
	addr := ":" + envOrDefault("PORT", "8080")
	server := api.NewServer()
	server.StartScheduler()
	defer server.Close()

	log.Printf("order controller API listening on %s", addr)
	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Fatal(err)
	}
}

func envOrDefault(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
