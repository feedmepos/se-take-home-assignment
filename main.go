package main

import (
	"context"

	"idreamshen.com/fmcode/cmd"
	"idreamshen.com/fmcode/eventbus"
	"idreamshen.com/fmcode/listener"
	"idreamshen.com/fmcode/repository"
	"idreamshen.com/fmcode/service"
)

func main() {

	eventbus.InitEventBus()

	repository.InitBotRepository()
	repository.InitOrderRepository()

	service.InitBotService()
	service.InitOrderService()

	go listener.LoopProcessEventBotAdded(context.Background())

	cmd.RunCmdLoopHandler()
}
