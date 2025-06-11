package eventbus

import (
	"context"
	"log"
)

var orderCreatedChan chan int64
var botAddedChan chan int64
var botDecredChan chan int64

func InitEventBus() {
	orderCreatedChan = make(chan int64, 1024)
	botAddedChan = make(chan int64, 64)
	botDecredChan = make(chan int64, 64)
}

func PublishOrderCreated(ctx context.Context, orderID int64) {
	log.Printf("生成事件，订单 %v 创建成功\n", orderID)
	orderCreatedChan <- orderID
}

func GetOrderCreatedChan(ctx context.Context) chan int64 {
	return orderCreatedChan
}

func PublishBotAdded(ctx context.Context, botID int64) {
	log.Printf("生成事件，机器人 %v 被添加\n", botID)
	botAddedChan <- botID
}

func GetBotAddedChan(ctx context.Context) chan int64 {
	return botAddedChan
}

func PublishBotDecred(ctx context.Context, botID int64) {
	log.Printf("生成事件，机器人 %v 被删除\n", botID)
	botDecredChan <- botID
}

func GetBotDecredChan(ctx context.Context) chan int64 {
	return botDecredChan
}
