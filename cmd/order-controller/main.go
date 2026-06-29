package main

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/ptrbug/se-take-home-assignment/internal/controller"
)

func main() {
	command := "demo"
	if len(os.Args) > 1 {
		command = strings.ToLower(os.Args[1])
	}

	var err error
	switch command {
	case "demo":
		err = runDemo(os.Stdout)
	case "interactive":
		err = runInteractive(os.Stdin, os.Stdout)
	case "help", "-h", "--help":
		printUsage(os.Stdout)
	default:
		printUsage(os.Stderr)
		err = fmt.Errorf("unknown command %q", command)
	}

	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func runDemo(out io.Writer) error {
	start := time.Date(2026, 6, 29, 14, 32, 1, 0, time.Local)
	c := controller.NewDefault()

	printLogs(out, []controller.LogEntry{{At: start, Message: "McDonald's Order Management System - Simulation Results"}})
	printLogs(out, c.Initialized(start))
	printLogs(out, c.AddOrder(controller.NormalOrder, start))
	printLogs(out, c.AddOrder(controller.VIPOrder, start.Add(1*time.Second)))
	printLogs(out, c.AddOrder(controller.NormalOrder, start.Add(1*time.Second)))
	printLogs(out, c.AddBot(start.Add(2*time.Second)))
	printLogs(out, c.AddBot(start.Add(3*time.Second)))
	printLogs(out, c.RemoveBot(start.Add(4*time.Second)))
	printLogs(out, c.AddOrder(controller.VIPOrder, start.Add(5*time.Second)))
	printLogs(out, c.AdvanceTo(start.Add(12*time.Second)))
	printLogs(out, c.AdvanceTo(start.Add(22*time.Second)))
	printLogs(out, c.AddBot(start.Add(23*time.Second)))
	printLogs(out, c.AdvanceTo(start.Add(32*time.Second)))
	printLogs(out, c.AdvanceTo(start.Add(33*time.Second)))
	printLogs(out, c.RemoveBot(start.Add(33*time.Second)))
	printLogs(out, c.Summary(start.Add(33*time.Second)))
	return nil
}

func runInteractive(in io.Reader, out io.Writer) error {
	c := controller.NewDefault()
	var mu sync.Mutex
	done := make(chan struct{})

	fmt.Fprintln(out, "McDonald's Order Management System - Interactive CLI")
	fmt.Fprintln(out, "Commands: normal, vip, +bot, -bot, status, help, quit")

	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()

	go func() {
		for {
			select {
			case now := <-ticker.C:
				mu.Lock()
				printLogs(out, c.AdvanceTo(now))
				mu.Unlock()
			case <-done:
				return
			}
		}
	}()

	scanner := bufio.NewScanner(in)
	for {
		fmt.Fprint(out, "> ")
		if !scanner.Scan() {
			close(done)
			return scanner.Err()
		}

		text := strings.ToLower(strings.TrimSpace(scanner.Text()))
		now := time.Now()

		mu.Lock()
		printLogs(out, c.AdvanceTo(now))
		shouldQuit := false
		switch text {
		case "normal", "n":
			printLogs(out, c.AddOrder(controller.NormalOrder, now))
		case "vip", "v":
			printLogs(out, c.AddOrder(controller.VIPOrder, now))
		case "+bot", "addbot", "add bot":
			printLogs(out, c.AddBot(now))
		case "-bot", "removebot", "remove bot":
			printLogs(out, c.RemoveBot(now))
		case "status", "s":
			printLogs(out, c.Status(now))
		case "help", "h", "?":
			fmt.Fprintln(out, "Commands: normal, vip, +bot, -bot, status, help, quit")
		case "quit", "exit", "q":
			printLogs(out, c.Summary(now))
			shouldQuit = true
		case "":
		default:
			fmt.Fprintf(out, "Unknown command %q. Type help for commands.\n", text)
		}
		mu.Unlock()

		if shouldQuit {
			close(done)
			return nil
		}
	}
}

func printUsage(out io.Writer) {
	fmt.Fprintln(out, "Usage: order-controller [demo|interactive]")
}

func printLogs(out io.Writer, logs []controller.LogEntry) {
	for _, log := range logs {
		fmt.Fprintln(out, log.String())
	}
}
