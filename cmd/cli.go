package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"order-controller/pkg/controller"
)

func printCLIHelp() {
	fmt.Println("Commands:")
	fmt.Println("  normal, n          New Normal Order")
	fmt.Println("  vip, v             New VIP Order")
	fmt.Println("  +bot, add-bot      Add cooking bot")
	fmt.Println("  -bot, remove-bot   Remove newest bot")
	fmt.Println("  status             Show system status")
	fmt.Println("  wait <seconds>     Pause (scripted mode)")
	fmt.Println("  final              Print final summary")
	fmt.Println("  help, h            Show this help")
	fmt.Println("  quit, exit, q      Exit")
}

func executeCommand(ctrl *controller.OrderController, line string) bool {
	line = strings.TrimSpace(line)
	if line == "" || strings.HasPrefix(line, "#") {
		return true
	}

	fields := strings.Fields(line)
	cmd := strings.ToLower(fields[0])

	switch cmd {
	case "normal", "n":
		ctrl.CreateNormalOrder()
	case "vip", "v":
		ctrl.CreateVIPOrder()
	case "+bot", "add-bot", "addbot":
		ctrl.AddBot()
	case "-bot", "remove-bot", "removebot":
		ctrl.RemoveBot()
	case "status":
		ctrl.PrintStatus()
	case "wait":
		if len(fields) < 2 {
			fmt.Println("usage: wait <seconds>")
			return true
		}
		seconds, err := strconv.Atoi(fields[1])
		if err != nil || seconds < 0 {
			fmt.Println("usage: wait <seconds>")
			return true
		}
		time.Sleep(time.Duration(seconds) * time.Second)
	case "final":
		ctrl.PrintFinalStatus()
	case "help", "h":
		printCLIHelp()
	case "quit", "exit", "q":
		return false
	default:
		fmt.Printf("unknown command: %s (type 'help' for commands)\n", cmd)
	}

	return true
}

func runInteractive(ctrl *controller.OrderController) {
	printCLIHelp()
	fmt.Println()

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}
		if !executeCommand(ctrl, scanner.Text()) {
			break
		}
	}
}

func runScript(ctrl *controller.OrderController, path string) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if !executeCommand(ctrl, scanner.Text()) {
			break
		}
	}

	return scanner.Err()
}
