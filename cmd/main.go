package main

import (
	"context"
	"cs/oms"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"os/signal"
	"syscall"
)

var interactive = flag.Bool("interactive", false, "interactive mode")

func main() {
	flag.Parse()
	if *interactive {
		start()
		return
	}

	var (
		ctx = context.Background()
		opc = oms.NewOrderPriorityCh(1000, ctx.Done())

		orderFlow  = oms.NewOrderFlow(ctx, opc)
		botManager = oms.NewBotManager(ctx, opc)
	)

	for range 4 {
		if rand.Float32() > 0.5 {
			orderFlow.AddOrder(oms.OrderPriority_Normal)
		} else {
			orderFlow.AddOrder(oms.OrderPriority_VIP)
		}
	}

	for _, order := range orderFlow.GetOrders() {
		fmt.Printf("%s %s %v\n", order.String(), order.Status, order.Stamps)
	}

	for range 2 {
		botManager.IncrBot()
	}

	orderFlow.Wait()

	for _, order := range orderFlow.GetOrders() {
		fmt.Printf("%s %s %v\n", order.String(), order.Status, order.Stamps)
	}
	fmt.Println("active bots:", botManager.CountActiveBot())
}

func start() {
	fmt.Println("McDonald's Order Management System")
	fmt.Print("functions: +normal | +vip | +bot | -bot | info | exit\n\n")

	var (
		ctx, cf = context.WithCancel(context.Background())
		opc     = oms.NewOrderPriorityCh(1000, ctx.Done())

		orderFlow  = oms.NewOrderFlow(ctx, opc)
		botManager = oms.NewBotManager(ctx, opc)
	)

	ch := make(chan os.Signal, 1)
	signal.Notify(ch, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-ch
		fmt.Println("\nbye")
		os.Exit(0)
	}()

	for {
		var cmd string
		fmt.Print("> ")
		fmt.Scanln(&cmd)

		switch cmd {
		case "":
			continue
		case "+normal":
			orderFlow.AddOrder(oms.OrderPriority_Normal)
		case "+vip":
			orderFlow.AddOrder(oms.OrderPriority_VIP)
		case "+bot":
			botManager.IncrBot()
		case "-bot":
			botManager.DecrBot()
		case "info":
			for _, order := range orderFlow.GetOrders() {
				fmt.Printf("%s %s %v\n", order.String(), order.Status, order.Stamps)
			}
			fmt.Println("active bots:", botManager.CountActiveBot())
		case "exit":
			cf()
			fmt.Println("bye")
			return
		default:
			fmt.Println("unknown")
		}
	}
}
