package main

import (
	"fmt"
	"se-take-home-assignment/pkg/controller"
	"time"
)

// === main ===
func main() {
	//var cmd string
	//controller.LogWithTime("Commands: normal | vip | + | - | status | quit")
	//for {
	//	fmt.Print("> ")
	//	_, err := fmt.Scanln(&cmd)
	//	if err != nil {
	//		// 可能是空输入，跳过
	//		continue
	//	}
	//	switch cmd {
	//	case "normal":
	//		m.CreateOrder(false)
	//	case "vip":
	//		m.CreateOrder(true)
	//	case "+":
	//		m.AddBot()
	//	case "-":
	//		m.RemoveBot()
	//	case "status":
	//		m.PrintStatus()
	//	case "quit":
	//		controller.LogWithTime("Exiting...")
	//		return
	//	default:
	//		controller.LogWithTime("Unknown command")
	//	}
	//}
	controller.LogWithTime("McDonald's Order Controller - Starting Simulation")
	fmt.Println("================================================")
	m := controller.NewManager()
	runSimulation(m)
}

func runSimulation(m *controller.Manager) {
	controller.LogWithTime("Starting Simulation...")
	m.CreateOrder(false)
	m.CreateOrder(false)
	m.PrintStatus()
	m.CreateOrder(true)
	m.CreateOrder(false)
	m.PrintStatus()
	m.AddBot()
	m.AddBot()
	time.Sleep(5 * time.Second)
	m.PrintStatus()
	m.RemoveBot()
	m.PrintStatus()
	time.Sleep(2 * time.Second)
	m.PrintStatus()
	m.CreateOrder(false)
	m.CreateOrder(true)
	m.CreateOrder(false)
	m.CreateOrder(true)
	m.PrintStatus()
	controller.LogWithTime("Finished Simulation")
}
