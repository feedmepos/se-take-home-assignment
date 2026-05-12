package main

import (
	"bufio"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"se-take-home-assignment/internal/controller"
)

var (
	reNewOrder      = regexp.MustCompile(`^([0-9]{2}:[0-9]{2}:[0-9]{2}) NEW_ORDER id=(\d+) type=(VIP|NORMAL) pending=(\d+)$`)
	reAddBot        = regexp.MustCompile(`^([0-9]{2}:[0-9]{2}:[0-9]{2}) ADD_BOT id=(\d+) total_bots=(\d+)$`)
	rePickup        = regexp.MustCompile(`^([0-9]{2}:[0-9]{2}:[0-9]{2}) BOT_PICKUP bot=(\d+) order=(\d+) type=(VIP|NORMAL)$`)
	reComplete      = regexp.MustCompile(`^([0-9]{2}:[0-9]{2}:[0-9]{2}) COMPLETE order=(\d+) type=(VIP|NORMAL) bot=(\d+) duration=([0-9]+(?:\.[0-9]+)?)s$`)
	reRemoveIdle    = regexp.MustCompile(`^([0-9]{2}:[0-9]{2}:[0-9]{2}) REMOVE_BOT id=(\d+)$`)
	reRemoveWorking = regexp.MustCompile(`^([0-9]{2}:[0-9]{2}:[0-9]{2}) REMOVE_BOT id=(\d+) interrupted_order=(\d+)$`)
	reBotIdle       = regexp.MustCompile(`^([0-9]{2}:[0-9]{2}:[0-9]{2}) BOT_IDLE bot=(\d+) pending=0$`)
)

func main() {
	args := os.Args[1:]
	isDemo := len(args) > 0 && args[0] == "demo"

	logger := func(line string) { fmt.Println(line) }
	if isDemo {
		logger = func(line string) { fmt.Println(formatDemoEvent(line)) }
	}

	ctrl := controller.New(10*time.Second, logger)
	if isDemo {
		runDemo(ctrl)
		return
	}
	runInteractive(ctrl)
}

func runDemo(ctrl *controller.Controller) {
	printDemoLine("System initialized with 0 bots")

	ctrl.AddOrder(controller.OrderTypeNormal)
	time.Sleep(1 * time.Second)
	ctrl.AddOrder(controller.OrderTypeVIP)
	time.Sleep(1 * time.Second)
	ctrl.AddOrder(controller.OrderTypeNormal)
	time.Sleep(1 * time.Second)
	ctrl.AddBot()
	time.Sleep(1 * time.Second)
	ctrl.AddBot()
	time.Sleep(11 * time.Second)
	ctrl.AddOrder(controller.OrderTypeVIP)
	ctrl.WaitForIdle(30 * time.Second)
	ctrl.RemoveNewestBot()
	printFinalStatus(ctrl)
}

func runInteractive(ctrl *controller.Controller) {
	printLine("Order controller started. Commands:")
	printLine("normal | vip | +bot | -bot | status | help | exit")

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Printf("%s > ", time.Now().Format("15:04:05"))
		if !scanner.Scan() {
			return
		}
		command := strings.TrimSpace(strings.ToLower(scanner.Text()))

		switch command {
		case "normal":
			order := ctrl.AddOrder(controller.OrderTypeNormal)
			printLinef("created normal order %d", order.ID)
		case "vip":
			order := ctrl.AddOrder(controller.OrderTypeVIP)
			printLinef("created vip order %d", order.ID)
		case "+bot":
			id := ctrl.AddBot()
			printLinef("added bot %d", id)
		case "-bot":
			id, ok := ctrl.RemoveNewestBot()
			if !ok {
				printLine("no bot to remove")
				continue
			}
			printLinef("removed bot %d", id)
		case "status":
			printStatus(ctrl)
		case "help":
			printLine("normal | vip | +bot | -bot | status | help | exit")
		case "exit":
			printLine("bye")
			return
		default:
			printLine("unknown command, type help")
		}
	}
}

func printStatus(ctrl *controller.Controller) {
	s := ctrl.Snapshot()
	printLine("---- STATUS ----")
	printLinef("pending: %v", stringifyOrders(s.Pending))
	printLinef("complete: %v", stringifyOrders(s.Complete))

	var botLines []string
	for _, b := range s.Bots {
		if b.OrderID == nil {
			botLines = append(botLines, fmt.Sprintf("bot=%d state=%s", b.ID, b.State))
			continue
		}
		botLines = append(botLines, fmt.Sprintf("bot=%d state=%s order=%d", b.ID, b.State, *b.OrderID))
	}
	printLinef("bots: %v", botLines)
	printLine("----------------")
}

func printFinalStatus(ctrl *controller.Controller) {
	s := ctrl.Snapshot()
	vip := 0
	normal := 0
	for _, o := range s.Complete {
		if o.Type == controller.OrderTypeVIP {
			vip++
		} else {
			normal++
		}
	}
	for _, o := range s.Pending {
		if o.Type == controller.OrderTypeVIP {
			vip++
		} else {
			normal++
		}
	}
	total := vip + normal

	fmt.Println()
	fmt.Println("Final Status:")
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", total, vip, normal)
	fmt.Printf("- Orders Completed: %d\n", len(s.Complete))
	fmt.Printf("- Active Bots: %d\n", len(s.Bots))
	fmt.Printf("- Pending Orders: %d\n", len(s.Pending))
}

func formatDemoEvent(line string) string {
	if m := reNewOrder.FindStringSubmatch(line); len(m) > 0 {
		return fmt.Sprintf("[%s] Created %s Order #%s - Status: PENDING", m[1], prettyType(m[3]), m[2])
	}
	if m := reAddBot.FindStringSubmatch(line); len(m) > 0 {
		return fmt.Sprintf("[%s] Bot #%s created - Status: ACTIVE", m[1], m[2])
	}
	if m := rePickup.FindStringSubmatch(line); len(m) > 0 {
		return fmt.Sprintf("[%s] Bot #%s picked up %s Order #%s - Status: PROCESSING", m[1], m[2], prettyType(m[4]), m[3])
	}
	if m := reComplete.FindStringSubmatch(line); len(m) > 0 {
		return fmt.Sprintf("[%s] Bot #%s completed %s Order #%s - Status: COMPLETE (Processing time: %ss)", m[1], m[4], prettyType(m[3]), m[2], m[5])
	}
	if m := reBotIdle.FindStringSubmatch(line); len(m) > 0 {
		return fmt.Sprintf("[%s] Bot #%s is now IDLE - No pending orders", m[1], m[2])
	}
	if m := reRemoveWorking.FindStringSubmatch(line); len(m) > 0 {
		return fmt.Sprintf("[%s] Bot #%s destroyed while PROCESSING Order #%s - Returned to PENDING", m[1], m[2], m[3])
	}
	if m := reRemoveIdle.FindStringSubmatch(line); len(m) > 0 {
		return fmt.Sprintf("[%s] Bot #%s destroyed while IDLE", m[1], m[2])
	}
	if strings.Contains(line, "REMOVE_BOT skipped=no_bots") {
		parts := strings.SplitN(line, " ", 2)
		if len(parts) > 0 {
			return fmt.Sprintf("[%s] No bot available to remove", parts[0])
		}
	}
	return withBracketTime(line)
}

func withBracketTime(line string) string {
	parts := strings.SplitN(line, " ", 2)
	if len(parts) != 2 {
		return line
	}
	if _, err := time.Parse("15:04:05", parts[0]); err != nil {
		return line
	}
	return fmt.Sprintf("[%s] %s", parts[0], parts[1])
}

func prettyType(orderType string) string {
	if strings.EqualFold(orderType, string(controller.OrderTypeVIP)) {
		return "VIP"
	}
	return "Normal"
}

func stringifyOrders(orders []controller.Order) []string {
	out := make([]string, 0, len(orders))
	for _, o := range orders {
		out = append(out, fmt.Sprintf("%d:%s", o.ID, o.Type))
	}
	return out
}

func printLine(message string) {
	fmt.Printf("%s %s\n", time.Now().Format("15:04:05"), message)
}

func printLinef(format string, args ...any) {
	printLine(fmt.Sprintf(format, args...))
}

func printDemoLine(message string) {
	fmt.Printf("[%s] %s\n", time.Now().Format("15:04:05"), message)
}
