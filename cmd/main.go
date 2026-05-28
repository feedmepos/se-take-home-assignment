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
	// Initialize terminal layout: Clear screen and split it
	// We set the scrolling region from Row 37 to the bottom.
	// The top 36 rows are reserved for the static live dashboard.
	fmt.Print("\033[2J")     // Clear screen
	fmt.Print("\033[37;r")    // Set scrolling margin (Row 37 to bottom)
	fmt.Print("\033[37;1H")   // Position cursor at Row 37

	d := controller.NewDispatcher(10 * time.Second)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Redraw dashboard whenever dispatcher logs events
	d.OnLogWritten = func() {
		drawDashboard(d)
	}

	go d.Start(ctx)

	// Initial render
	drawDashboard(d)

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
			// Reset terminal scrolling region and clear screen before exiting
			fmt.Print("\033[r")
			fmt.Print("\033[2J")
			fmt.Print("\033[1;1H")
			fmt.Println("Shutting down McDonald's Cooking Bot Simulation. Goodbye!")
			d.Stop()
			return

		case "help", "h":
			printHelp()

		case "normal", "n", "add normal":
			d.AddOrder(controller.OrderNormal)

		case "vip", "v", "add vip":
			d.AddOrder(controller.OrderVIP)

		case "+", "+ bot", "add bot":
			d.ScaleUp()

		case "-", "- bot", "remove bot":
			d.ScaleDown()

		case "status", "s":
			// Redundant now that it's live, but keeps the command working
			d.Log("System status checked by user")

		case "logs", "l":
			// Redundant now that logs are live, but lists them in scrolling area
			fmt.Println(colorBold + "--- Past System Logs ---" + colorReset)
			for _, logLine := range d.GetLogs() {
				fmt.Println(logLine)
			}

		default:
			fmt.Printf("%sUnknown command: %q. Type 'help' for options.%s\n", colorRed, cmd, colorReset)
		}
	}
}

func drawDashboard(d *controller.Dispatcher) {
	// Save cursor position
	fmt.Print("\033[s")

	// Move cursor to Row 1, Col 1 (outside scrolling region)
	fmt.Print("\033[1;1H")

	// Get latest system state
	activeBots, pending, processing, completed := d.GetStatus()

	// 1. Header Banner (3 lines)
	fmt.Print("\033[K" + colorBold + colorMagenta + "  === McDonald's Cooking Bot Simulation - Live Dashboard ===" + colorReset + "\n")
	fmt.Printf("\033[K  Active Bots: %d | Pending: %d | Cooking: %d | Completed: %d\n", activeBots, len(pending), len(processing), len(completed))
	fmt.Print("\033[K----------------------------------------------------------------------\n")

	// 2. Pending Queue (shows top 10 items) (11 lines total)
	fmt.Print("\033[K" + colorBold + "PENDING QUEUE (Top 10):" + colorReset + "\n")
	for i := 0; i < 10; i++ {
		if i < len(pending) {
			o := pending[i]
			typeColor := colorCyan
			if o.Type == controller.OrderVIP {
				typeColor = colorBold + colorYellow
			}
			fmt.Printf("\033[K  - Order #%d [%s%s%s]\n", o.ID, typeColor, o.Type, colorReset)
		} else {
			fmt.Print("\033[K\n")
		}
	}

	// 3. Cooking in Progress (shows top 10 items) (11 lines total)
	fmt.Print("\033[K\n" + colorBold + "COOKING IN PROGRESS (Top 10):" + colorReset + "\n")
	for i := 0; i < 10; i++ {
		if i < len(processing) {
			o := processing[i]
			typeColor := colorCyan
			if o.Type == controller.OrderVIP {
				typeColor = colorBold + colorYellow
			}
			fmt.Printf("\033[K  - Order #%d [%s%s%s] -> COOKING\n", o.ID, typeColor, o.Type, colorReset)
		} else {
			fmt.Print("\033[K\n")
		}
	}

	// 4. Recent Logs (shows last 8 lines) (9 lines total)
	fmt.Print("\033[K\n" + colorBold + "RECENT EVENT LOGS (Live):" + colorReset + "\n")
	logs := d.GetLogs()
	start := len(logs) - 8
	if start < 0 {
		start = 0
	}
	for i := 0; i < 8; i++ {
		logIdx := start + i
		if logIdx < len(logs) {
			fmt.Printf("\033[K  %s\n", logs[logIdx])
		} else {
			fmt.Print("\033[K\n")
		}
	}

	fmt.Print("\033[K======================================================================\n")

	// Restore cursor back to user prompt
	fmt.Print("\033[u")
}

func printHelp() {
	fmt.Println(colorBold + "Available Commands:" + colorReset)
	fmt.Printf("  %-20s Create a new Normal order (PENDING)\n", colorCyan+"normal / n"+colorReset)
	fmt.Printf("  %-20s Create a new VIP order (PENDING)\n", colorCyan+"vip / v"+colorReset)
	fmt.Printf("  %-20s Spawn a new bot to cook orders\n", colorCyan+"+ / add bot"+colorReset)
	fmt.Printf("  %-20s Destroy the newest bot (aborts active cooking if busy)\n", colorCyan+"- / remove bot"+colorReset)
	fmt.Printf("  %-20s Print past system logs in scrolling buffer\n", colorCyan+"logs / l"+colorReset)
	fmt.Printf("  %-20s Print this help menu\n", colorCyan+"help / h"+colorReset)
	fmt.Printf("  %-20s Exit the application\n", colorCyan+"exit / q"+colorReset)
}
