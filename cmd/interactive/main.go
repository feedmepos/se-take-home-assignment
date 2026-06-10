// Interactive CLI reads commands from stdin for live interview demonstration.
// Commands: new normal, new vip, + bot, - bot, status, exit
package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/controller"
)

func main() {
	c := controller.NewController(os.Stdout, func() <-chan time.Time {
		return time.After(10 * time.Second)
	})

	scanner := bufio.NewScanner(os.Stdin)
	fmt.Println("FeedMe Order Controller - Interactive Mode")
	fmt.Println("Commands: new normal | new vip | + bot | - bot | status | exit")
	fmt.Println()

	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		switch line {
		case "new normal":
			c.AddNormalOrder()
		case "new vip":
			c.AddVIPOrder()
		case "+ bot":
			c.AddBot()
		case "- bot":
			c.RemoveBot()
		case "status":
			c.PrintStatus()
		case "exit":
			fmt.Println("Goodbye!")
			return
		default:
			fmt.Printf("Unknown command: %s\n", line)
		}
	}
}
