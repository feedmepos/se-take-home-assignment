package main

import (
	"fmt"
	"log"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/application"
	"github.com/feedmepos/se-take-home-assignment/internal/domain"
	"github.com/feedmepos/se-take-home-assignment/internal/memory"
	"github.com/feedmepos/se-take-home-assignment/pkg"
)

func main() {
	fileWriter, err := pkg.NewFileWriter("scripts/result.txt")
	if err != nil {
		log.Fatalf("feedme: failed to open result.txt: %v", err)
	}
	defer fileWriter.Close()

	eventBus := memory.NewEventBus(fileWriter)
	go eventBus.Listen()
	defer eventBus.Close()

	var (
		orderRepo = memory.NewOrderRepo()
		depsVIP   = application.OrderDeps{
			OrderRepo: orderRepo,
			Event:     eventBus,
			Queue:     memory.NewQueueRepo(),
			Type:      domain.OrderTypeVIP,
		}
		depsNormal = application.OrderDeps{
			OrderRepo: orderRepo,
			Event:     eventBus,
			Queue:     memory.NewQueueRepo(),
			Type:      domain.OrderTypeNormal,
		}

		orderVIP    = application.NewOrderApp(10*time.Second, depsVIP)
		orderNormal = application.NewOrderApp(10*time.Second, depsNormal)
		botApp      = application.NewBotApp(orderVIP, orderNormal, eventBus)
	)

	go botApp.Listen()
	defer botApp.Close()

	fileWriter.Write("McDonald's Order Management System - Simulation Results")
	fileWriter.Write("")
	fileWriter.Write(fmt.Sprintf("[%s] System initialized with %d bots", time.Now().Format("15:04:05"), len(botApp.ListBot())))

	cli := NewCLI(orderVIP, orderNormal, botApp)
	cli.Run(fileWriter)
}
