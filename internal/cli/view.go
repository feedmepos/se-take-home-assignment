package cli

import "fmt"

const (
	colorReset  = "\033[0m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorGreen  = "\033[32m"
)

func printMenu() {
	fmt.Println()
	fmt.Printf("%s=== McDonald's Order Controller ===%s\n", colorYellow, colorReset)
	fmt.Println("1 - add new normal order")
	fmt.Println("2 - add new VIP order")
	fmt.Println("3 - add bot")
	fmt.Println("4 - remove bot")
	fmt.Println("5 - exit")
}

func printStatus(r *Runner) {
	fmt.Println()
	fmt.Printf("%s=== Current Status ===%s\n", colorBlue, colorReset)
	fmt.Printf("Active Bots: %s%d%s\n", colorBlue, len(r.controller.Bots()), colorReset)
	fmt.Printf("Pending Orders: %s%d%s\n", colorYellow, len(r.controller.PendingOrders()), colorReset)
	fmt.Printf("Completed Orders: %s%d%s\n", colorGreen, len(r.controller.CompleteOrder()), colorReset)

	pending := r.controller.PendingOrders()
	if len(pending) > 0 {
		fmt.Println("Pending Queue:")
		for i, o := range pending {
			fmt.Printf("%d. #%d (%s)\n", i+1, o.ID, o.OrderType())
		}
	}
	bots := r.controller.Bots()
	if len(bots) > 0 {
		fmt.Println("Bots Status:")
		for _, b := range bots {
			status := "Idle"
			if b.Current != nil {
				fmt.Printf("- Bot #%d → Processing %s Order #%d\n", b.ID, b.Current.OrderType(), b.Current.ID)
			} else {
				fmt.Printf("- Bot #%d → %s\n", b.ID, status)
			}
		}
	}
}
