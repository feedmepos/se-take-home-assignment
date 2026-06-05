package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/feedmepos/se-take-home-assignment/internal/controller"
	"github.com/feedmepos/se-take-home-assignment/internal/simulation"
)

func main() {
	ctrl := controller.New()

	if len(os.Args) > 1 && os.Args[1] == "--simulate" {
		simulation.Run(ctrl)
		return
	}

	runInteractive(ctrl)
}

func runInteractive(ctrl *controller.Controller) {
	fmt.Println("McDonald's Order Controller (type 'help' for commands)")
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "exit" || line == "quit" || line == "q" {
			break
		}
		fmt.Printf("unknown command: %s\n", line)
	}
}
