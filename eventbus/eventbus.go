package eventbus

import (
	"context"
	"log"
)

var orderCreatedChan chan int64
var botAddedChan chan int64

func InitEventBus() {
	orderCreatedChan = make(chan int64, 1024)
	botAddedChan = make(chan int64, 64)
}

func PublishOrderCreated(ctx context.Context, orderID int64) {
	log.Printf("Event generated: Order %v created successfully\n", orderID)
	orderCreatedChan <- orderID
}

func GetOrderCreatedChan(ctx context.Context) chan int64 {
	return orderCreatedChan
}

func PublishBotAdded(ctx context.Context, botID int64) {
	log.Printf("Event generated: Bot %v added\n", botID)
	botAddedChan <- botID
}

func GetBotAddedChan(ctx context.Context) chan int64 {
	return botAddedChan
}
