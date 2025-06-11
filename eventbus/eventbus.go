package eventbus

import "context"

var orderCreatedChan chan int64
var botAddedChan chan int64
var botDecredChan chan int64

func InitEventBus() {
	orderCreatedChan = make(chan int64, 1024)
	botAddedChan = make(chan int64, 64)
	botDecredChan = make(chan int64, 64)
}

func PublishOrderCreated(ctx context.Context, orderID int64) {
	orderCreatedChan <- orderID
}

func GetOrderCreatedChan(ctx context.Context) chan int64 {
	return orderCreatedChan
}

func PublishBotAdded(ctx context.Context, botID int64) {
	botAddedChan <- botID
}

func GetBotAddedChan(ctx context.Context) chan int64 {
	return botAddedChan
}

func PublishBotDecred(ctx context.Context, botID int64) {
	botDecredChan <- botID
}

func GetBotDecredChan(ctx context.Context) chan int64 {
	return botDecredChan
}
