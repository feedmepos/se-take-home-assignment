package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"order-controller/internal/controller"
)

func main() {
	demo := flag.Bool("demo", false, "run a scripted demo scenario and exit")
	flag.Parse()

	if *demo {
		runDemo()
		return
	}
	runInteractive()
}

// runDemo executes a fixed scenario using real 10s processing so result.txt
// reflects the spec faithfully. Kept short to stay CI-friendly.
func runDemo() {
	m := controller.NewManager(10*time.Second, os.Stdout)
	fmt.Fprintln(os.Stdout, "McDonald's Order Management System - Demo")
	fmt.Fprintln(os.Stdout, "")

	m.AddNormalOrder()
	m.AddVIPOrder()
	m.AddNormalOrder()

	m.AddBot()
	m.AddBot()

	time.Sleep(5 * time.Second)
	m.AddVIPOrder()

	time.Sleep(12 * time.Second)
	m.RemoveBot()

	// Wait for the remaining bot to finish the returned order.
	time.Sleep(15 * time.Second)

	printStatus(m)
	m.Stop()
}

func printStatus(m *controller.Manager) {
	s := m.Status()
	fmt.Fprintln(os.Stdout, "")
	fmt.Fprintln(os.Stdout, "Final Status:")
	fmt.Fprintf(os.Stdout, "- Active Bots: %d\n", s.BotCount)
	fmt.Fprintf(os.Stdout, "- Pending Orders: %d\n", len(s.Pending))
	fmt.Fprintf(os.Stdout, "- Completed Orders: %d\n", len(s.Completed))
}

// runInteractive is the REPL required for the next interview round.
func runInteractive() {
	m := controller.NewManager(10*time.Second, os.Stdout)
	printHelp()

	scanner := bufio.NewScanner(os.Stdin)
	fmt.Print("> ")
	for scanner.Scan() {
		cmd := strings.TrimSpace(strings.ToLower(scanner.Text()))
		switch cmd {
		case "normal", "n":
			m.AddNormalOrder()
		case "vip", "v":
			m.AddVIPOrder()
		case "+bot", "+":
			m.AddBot()
		case "-bot", "-":
			m.RemoveBot()
		case "status", "s":
			printStatus(m)
		case "help", "h", "?":
			printHelp()
		case "exit", "quit", "q":
			m.Stop()
			fmt.Println("Bye")
			return
		case "":
		default:
			fmt.Printf("Unknown command: %q (type 'help')\n", cmd)
		}
		fmt.Print("> ")
	}
	if err := scanner.Err(); err != nil {
		fmt.Fprintln(os.Stderr, "input error:", err)
	}
	m.Stop()
}

func printHelp() {
	fmt.Println("McDonald's Order Management System")
	fmt.Println("Commands:")
	fmt.Println("  normal | n   - new Normal order")
	fmt.Println("  vip    | v   - new VIP order")
	fmt.Println("  +bot   | +   - add a cooking bot")
	fmt.Println("  -bot   | -   - remove the newest bot")
	fmt.Println("  status | s   - show current status")
	fmt.Println("  help   | h   - show this help")
	fmt.Println("  exit   | q   - quit")
}
