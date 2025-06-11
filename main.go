package main

import (
	"context"

	"idreamshen.com/fmcode/cmd"
	"idreamshen.com/fmcode/eventbus"
	"idreamshen.com/fmcode/listener"
	"idreamshen.com/fmcode/service"
	"idreamshen.com/fmcode/storage"
)

func main() {

	eventbus.InitEventBus()

	storage.InitBotStorage()
	storage.InitOrderStorage()

	service.InitBotService()
	service.InitOrderService()

	go listener.ProcessEventBotAdded(context.Background())
	go listener.ProcessEventBotDecred(context.Background())
	cmd.RunCmdLoopHandler()
}
