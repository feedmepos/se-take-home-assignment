package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/feedmepos/se-take-home-assignment/pkg/controller"
)

const (
	banner = `
  __  ___      ____                  _     __    
 /  |/  /___  / __ \____  ____  ____(_)___/ /____
/ /|_/ / ___// / / / __ \/ __ \/ __ / / __  / ___/
/ /  / / /__ / /_/ / /_/ / /_/ / /_/ / / /_/ (__  ) 
/_/  /_/\___//_____/\____/ .___/\__,_/_/\__,_/____/  
                      /_/                          
      McDonald's Cooking Bot Controller & Simulator
`
	// ANSI Color Codes
	colorReset  = "\033[0m"
	colorBold   = "\033[1m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorMagenta= "\033[35m"
	colorCyan   = "\033[36m"
	colorGray   = "\033[90m"
)

func main() {
	simulateFlag := flag.Bool("simulate", false, "Run the automated simulation and output to result.txt")
	interactiveFlag := flag.Bool("interactive", false, "Run in interactive CLI mode")
	flag.Parse()

	// Default: if no flags are provided, check if stdin is a terminal.
	// If it is NOT a terminal (e.g. GitHub Actions executing run.sh), run simulation.
	// Otherwise, run interactive.
	runInteractive := *interactiveFlag
	if !*simulateFlag && !*interactiveFlag {
		fi, _ := os.Stdin.Stat()
		if (fi.Mode() & os.ModeCharDevice) != 0 {
			runInteractive = true
		}
	}

	if runInteractive {
		runInteractiveCLI()
	} else {
		runSimulation()
	}
}

func runSimulation() {
	// The simulation runs real-time with 10s cook times to match result.txt requirements
	cookDuration := 10 * time.Second
	d := controller.NewDispatcher(cookDuration)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go d.Start(ctx)
	// Give dispatcher loop a tiny moment to spin up and log initial status
	time.Sleep(100 * time.Millisecond)

	// Timeline mapping:
	// T+0s: Created Normal Order #1001 - Status: PENDING
	d.AddOrder(controller.OrderNormal)

	// T+1s: Created VIP Order #1002, Normal Order #1003
	time.Sleep(1 * time.Second)
	d.AddOrder(controller.OrderVIP)
	d.AddOrder(controller.OrderNormal)

	// T+2s: Bot #1 created
	time.Sleep(1 * time.Second)
	d.ScaleUp()

	// T+3s: Bot #2 created
	time.Sleep(1 * time.Second)
	d.ScaleUp()

	// Wait 11 seconds to reach T+14s
	time.Sleep(11 * time.Second)
	// T+14s: Created VIP Order #1004
	d.AddOrder(controller.OrderVIP)

	// Wait 10 seconds to reach T+24s
	time.Sleep(10 * time.Second)
	// T+24s: Scale down Bot #2 (destroyed while IDLE)
	d.ScaleDown()

	// Wait 2 seconds to ensure Bot #1 finishes Normal #1003 and becomes IDLE
	time.Sleep(2 * time.Second)

	// Print final stats summary to match the required result.txt final format
	activeBots, pending, _, completed := d.GetStatus()
	totalVIPCompleted := 0
	totalNormalCompleted := 0
	for _, o := range completed {
		if o.Type == controller.OrderVIP {
			totalVIPCompleted++
		} else {
			totalNormalCompleted++
		}
	}

	fmt.Println()
	fmt.Println("Final Status:")
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", len(completed), totalVIPCompleted, totalNormalCompleted)
	fmt.Printf("- Orders Completed: %d\n", len(completed))
	fmt.Printf("- Active Bots: %d\n", activeBots)
	fmt.Printf("- Pending Orders: %d\n", len(pending))

	d.Stop()
}

func runInteractiveCLI() {
	fmt.Print(colorMagenta + banner + colorReset)
	fmt.Println("Type 'help' to see available commands.")
	fmt.Println("Starting central dispatcher with 10s cook duration...")

	d := controller.NewDispatcher(10 * time.Second)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go d.Start(ctx)

	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Printf("\n%sMcDonald's CLI>%s ", colorBold+colorYellow, colorReset)
		input, err := reader.ReadString('\n')
		if err != nil {
			break
		}
		cmd := strings.TrimSpace(strings.ToLower(input))
		if cmd == "" {
			continue
		}

		switch cmd {
		case "exit", "quit", "q":
			fmt.Println("Shutting down McDonald's Cooking Bot Simulation. Goodbye!")
			d.Stop()
			return

		case "help", "h":
			printHelp()

		case "normal", "n", "add normal":
			d.AddOrder(controller.OrderNormal)
			fmt.Printf("%s[SYSTEM]%s Request sent: Create Normal Order\n", colorGreen, colorReset)

		case "vip", "v", "add vip":
			d.AddOrder(controller.OrderVIP)
			fmt.Printf("%s[SYSTEM]%s Request sent: Create VIP Order\n", colorGreen, colorReset)

		case "+", "+ bot", "add bot":
			d.ScaleUp()
			fmt.Printf("%s[SYSTEM]%s Request sent: Spawn Bot\n", colorGreen, colorReset)

		case "-", "- bot", "remove bot":
			d.ScaleDown()
			fmt.Printf("%s[SYSTEM]%s Request sent: Remove Newest Bot\n", colorGreen, colorReset)

		case "status", "s":
			printInteractiveStatus(d)

		case "logs", "l":
			fmt.Println(colorBold + "--- System Logs ---" + colorReset)
			for _, logLine := range d.GetLogs() {
				fmt.Println(logLine)
			}

		default:
			fmt.Printf("%sUnknown command: %q. Type 'help' for options.%s\n", colorRed, cmd, colorReset)
		}
	}
}

func printHelp() {
	fmt.Println(colorBold + "Available Commands:" + colorReset)
	fmt.Printf("  %-20s Create a new Normal order (PENDING)\n", colorCyan+"normal / n"+colorReset)
	fmt.Printf("  %-20s Create a new VIP order (PENDING)\n", colorCyan+"vip / v"+colorReset)
	fmt.Printf("  %-20s Spawn a new bot to cook orders\n", colorCyan+"+ / add bot"+colorReset)
	fmt.Printf("  %-20s Destroy the newest bot (aborts active cooking if busy)\n", colorCyan+"- / remove bot"+colorReset)
	fmt.Printf("  %-20s Display current status of all orders and bots\n", colorCyan+"status / s"+colorReset)
	fmt.Printf("  %-20s Print full transaction logs with HH:MM:SS timestamps\n", colorCyan+"logs / l"+colorReset)
	fmt.Printf("  %-20s Print this help menu\n", colorCyan+"help / h"+colorReset)
	fmt.Printf("  %-20s Exit the application\n", colorCyan+"exit / q"+colorReset)
}

func printInteractiveStatus(d *controller.Dispatcher) {
	activeBots, pending, processing, completed := d.GetStatus()

	fmt.Println()
	fmt.Println(colorBold + "==================================================" + colorReset)
	fmt.Printf("%s[SYSTEM STATE]%s\n", colorBold+colorMagenta, colorReset)
	fmt.Printf("  Active Bots:       %d\n", activeBots)
	fmt.Printf("  Pending Orders:    %d\n", len(pending))
	fmt.Printf("  Processing Orders: %d\n", len(processing))
	fmt.Printf("  Completed Orders:  %d\n", len(completed))
	fmt.Println(colorBold + "--------------------------------------------------" + colorReset)

	// 1. Pending List
	fmt.Println(colorBold + "PENDING AREA:" + colorReset)
	if len(pending) == 0 {
		fmt.Printf("  %s(No pending orders)%s\n", colorGray, colorReset)
	} else {
		for _, o := range pending {
			typeColor := colorCyan
			if o.Type == controller.OrderVIP {
				typeColor = colorBold + colorYellow
			}
			fmt.Printf("  - Order #%d [%s%s%s]\n", o.ID, typeColor, o.Type, colorReset)
		}
	}

	// 2. Processing List
	fmt.Println("\n" + colorBold + "PROCESSING (COOKING):" + colorReset)
	if len(processing) == 0 {
		fmt.Printf("  %s(No active cooking processes)%s\n", colorGray, colorReset)
	} else {
		for _, o := range processing {
			typeColor := colorCyan
			if o.Type == controller.OrderVIP {
				typeColor = colorBold + colorYellow
			}
			fmt.Printf("  - Order #%d [%s%s%s] -> COOKING\n", o.ID, typeColor, o.Type, colorReset)
		}
	}

	// 3. Completed List
	fmt.Println("\n" + colorBold + "COMPLETE AREA:" + colorReset)
	if len(completed) == 0 {
		fmt.Printf("  %s(No completed orders yet)%s\n", colorGray, colorReset)
	} else {
		// Just show the last 5 completed to save space
		startIdx := 0
		if len(completed) > 5 {
			startIdx = len(completed) - 5
		}
		for i := startIdx; i < len(completed); i++ {
			o := completed[i]
			fmt.Printf("  - %sOrder #%d [%s]%s\n", colorGreen, o.ID, o.Type, colorReset)
		}
		if len(completed) > 5 {
			fmt.Printf("  %s... and %d more completed orders%s\n", colorGray, len(completed)-5, colorReset)
		}
	}
	fmt.Println(colorBold + "==================================================" + colorReset)
}
