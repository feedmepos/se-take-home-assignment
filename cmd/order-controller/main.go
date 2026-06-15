package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/feedme/order-controller/internal/controller"
)

func main() {
	demo := flag.Bool("demo", false, "run a deterministic order controller simulation")
	interactive := flag.Bool("interactive", false, "run an interactive CLI")
	flag.Parse()

	if *demo || (!*interactive && flag.NArg() > 0 && flag.Arg(0) == "demo") {
		runDemo(os.Stdout)
		return
	}

	runInteractive(os.Stdin, os.Stdout)
}

func runDemo(w io.Writer) {
	c := controller.New()
	now := time.Date(2026, 6, 12, 14, 32, 1, 0, time.Local)

	fmt.Fprintln(w, "McDonald's Order Management System - Simulation Results")
	fmt.Fprintln(w)

	c.Init(now)
	c.AddOrder(controller.Normal, now)
	now = now.Add(1 * time.Second)
	c.AddOrder(controller.VIP, now)
	c.AddOrder(controller.Normal, now)
	now = now.Add(1 * time.Second)
	c.AddBot(now)
	now = now.Add(1 * time.Second)
	c.AddBot(now)

	now = now.Add(11 * time.Second)
	c.AdvanceTo(now)
	c.AddOrder(controller.VIP, now)

	now = now.Add(10 * time.Second)
	c.AdvanceTo(now)
	c.RemoveNewestBot(now)

	_ = c.WriteEvents(w)
	fmt.Fprintln(w)
	fmt.Fprintln(w, c.SummaryText())
}

func runInteractive(r io.Reader, w io.Writer) {
	c := controller.New()
	now := time.Now().Truncate(time.Second)
	c.Init(now)

	fmt.Fprintln(w, "McDonald's Order Management System CLI")
	fmt.Fprintln(w, "Commands: normal, vip, bot+, bot-, status, wait <seconds>, help, exit")
	fmt.Fprintln(w)
	_ = c.WriteEvents(w)

	scanner := bufio.NewScanner(r)
	for {
		fmt.Fprint(w, "> ")
		if !scanner.Scan() {
			fmt.Fprintln(w)
			return
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		before := len(c.Events())
		if line != "wait" && !strings.HasPrefix(line, "wait ") {
			now = time.Now().Truncate(time.Second)
			c.AdvanceTo(now)
		}

		switch {
		case line == "normal":
			c.AddOrder(controller.Normal, now)
		case line == "vip":
			c.AddOrder(controller.VIP, now)
		case line == "bot+":
			c.AddBot(now)
		case line == "bot-":
			c.RemoveNewestBot(now)
		case line == "status":
			fmt.Fprintln(w, c.StatusText())
		case strings.HasPrefix(line, "wait"):
			seconds := parseWaitSeconds(line)
			now = now.Add(time.Duration(seconds) * time.Second)
			c.AdvanceTo(now)
		case line == "help":
			fmt.Fprintln(w, "normal: add a normal order")
			fmt.Fprintln(w, "vip: add a VIP order")
			fmt.Fprintln(w, "bot+: add a cooking bot")
			fmt.Fprintln(w, "bot-: remove the newest cooking bot")
			fmt.Fprintln(w, "status: print current queues and bots")
			fmt.Fprintln(w, "wait <seconds>: advance the simulation clock")
			fmt.Fprintln(w, "exit: quit")
		case line == "exit" || line == "quit":
			fmt.Fprintln(w, c.SummaryText())
			return
		default:
			fmt.Fprintln(w, "Unknown command. Type help for available commands.")
		}

		for _, event := range c.Events()[before:] {
			fmt.Fprintln(w, event)
		}
	}
}

func parseWaitSeconds(line string) int {
	parts := strings.Fields(line)
	if len(parts) != 2 {
		return 1
	}
	seconds, err := strconv.Atoi(parts[1])
	if err != nil || seconds < 1 {
		return 1
	}
	return seconds
}
