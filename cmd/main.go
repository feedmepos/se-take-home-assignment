package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"order-controller/pkg/controller"
)

func main() {
	interactive := flag.Bool("i", false, "run interactive CLI")
	scriptFile := flag.String("f", "", "run commands from a script file")
	flag.Parse()

	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println("")

	ctrl := controller.NewOrderController()
	ctrl.LogWithTimestamp("System initialized with 0 bots")

	switch {
	case *scriptFile != "":
		if err := runScript(ctrl, *scriptFile); err != nil {
			fmt.Fprintf(os.Stderr, "script error: %v\n", err)
			os.Exit(1)
		}
	case *interactive:
		runInteractive(ctrl)
	default:
		runSimulation(ctrl)
	}
}

func runSimulation(ctrl *controller.OrderController) {
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.CreateNormalOrder()

	time.Sleep(1 * time.Second)

	ctrl.AddBot()
	time.Sleep(1 * time.Second)
	ctrl.AddBot()

	time.Sleep(12 * time.Second)

	ctrl.CreateVIPOrder()
	time.Sleep(1 * time.Second)

	time.Sleep(12 * time.Second)

	ctrl.RemoveBot()
	ctrl.WaitUntilIdle()

	ctrl.PrintFinalStatus()
}
