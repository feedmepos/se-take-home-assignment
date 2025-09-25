package main

import (
	"fmt"
	"se-take-home-assignment/pkg/controller"
)

// === main ===
func main() {
	m := controller.NewManager()
	var cmd string
	controller.LogWithTime("Commands: normal | vip | + | - | status | quit")
	for {
		fmt.Print("> ")
		_, err := fmt.Scanln(&cmd)
		if err != nil {
			// 可能是空输入，跳过
			continue
		}
		switch cmd {
		case "normal":
			m.CreateOrder(false)
		case "vip":
			m.CreateOrder(true)
		case "+":
			m.AddBot()
		case "-":
			m.RemoveBot()
		case "status":
			m.PrintStatus()
		case "quit":
			controller.LogWithTime("Exiting...")
			return
		default:
			controller.LogWithTime("Unknown command")
		}
	}
}
