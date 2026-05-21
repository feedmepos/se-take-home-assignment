package cli

import (
	"bufio"
	"fmt"
	"os"
	"se-take-home-assignment/internal/sim"
	"strings"
	"time"
)

type Runner struct {
	controller *sim.Controller
	scanner    *bufio.Scanner
	lastTick   time.Time
}

func New() *Runner {
	return &Runner{
		controller: sim.NewController(1001),
		scanner:    bufio.NewScanner(os.Stdin),
		lastTick:   time.Now(),
	}
}

func (r *Runner) Run() {
	for {
		r.advanceTicks()
		printStatus(r)

		printMenu()
		fmt.Print("Choose: ")

		r.scanner.Scan()
		input := r.scanner.Text()

		switch strings.TrimSpace(input) {
		case "1":
			r.handleNormalAddOrder()
		case "2":
			r.handleAddVIPOrder()
		case "3":
			r.handleAddBot()
		case "4":
			r.handleRemoveBot()
		case "5":
			fmt.Println("Exiting...")
			return
		default:
			fmt.Println("Invalid choice, please try again.")
		}
	}
}

func (r *Runner) advanceTicks() {
	now := time.Now()
	steps := int(now.Sub(r.lastTick).Seconds())
	for i := 0; i < steps; i++ {
		r.controller.Tick()
	}
	if steps > 0 {
		r.lastTick = r.lastTick.Add(time.Duration(steps) * time.Second)
	}
}
