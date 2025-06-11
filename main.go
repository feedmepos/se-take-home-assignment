package main

import (
	"idreamshen.com/fmcode/cmd"
	"idreamshen.com/fmcode/service"
	"idreamshen.com/fmcode/storage"
)

func main() {

	storage.InitBotStorage()
	storage.InitOrderStorage()

	service.InitBotService()
	service.InitOrderService()

	cmd.RunCmdLoopHandler()
}
