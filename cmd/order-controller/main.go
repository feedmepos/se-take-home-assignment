package main

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"

	"se-take-home-assignment/internal/order"
)

func main() {
	mode := "demo"
	if len(os.Args) > 1 {
		mode = os.Args[1]
	}

	switch mode {
	case "demo":
		runDemo(os.Stdout)
	case "interactive":
		runInteractive(os.Stdin, os.Stdout)
	default:
		fmt.Fprintf(os.Stderr, "unknown mode %q\n", mode)
		os.Exit(2)
	}
}

func runDemo(w io.Writer) {
	c := order.NewController()
	c.AddOrder(order.Normal)
	c.Advance(1)
	c.AddOrder(order.VIP)
	c.AddOrder(order.Normal)
	c.Advance(1)
	c.AddBot()
	c.Advance(1)
	c.AddBot()
	c.Advance(4)
	c.AddOrder(order.VIP)
	c.Advance(2)
	c.RemoveBot()
	c.Advance(1)
	c.AddBot()
	c.Advance(30)

	fmt.Fprintln(w, "McDonald's Order Management System - Simulation Results")
	fmt.Fprintln(w)
	_ = c.WriteLog(w)
	fmt.Fprintln(w)
	fmt.Fprintln(w, c.Summary())
}

func runInteractive(r io.Reader, w io.Writer) {
	c := order.NewController()
	scanner := bufio.NewScanner(r)
	fmt.Fprintln(w, "Commands: normal, vip, +bot, -bot, tick <seconds>, status, quit")
	for {
		fmt.Fprint(w, "> ")
		if !scanner.Scan() {
			break
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		if line == "quit" || line == "exit" {
			break
		}
		logStart := c.LogLen()
		if err := execute(c, line); err != nil {
			fmt.Fprintf(w, "error: %v\n", err)
			continue
		}
		_ = c.WriteLogFrom(w, logStart)
		fmt.Fprintln(w, c.Snapshot())
	}
}

func execute(c *order.Controller, line string) error {
	fields := strings.Fields(strings.ToLower(line))
	switch fields[0] {
	case "normal", "new-normal", "new_normal":
		c.AddOrder(order.Normal)
	case "vip", "new-vip", "new_vip":
		c.AddOrder(order.VIP)
	case "+bot", "add-bot", "add_bot":
		c.AddBot()
	case "-bot", "remove-bot", "remove_bot":
		c.RemoveBot()
	case "tick", "advance":
		if len(fields) != 2 {
			return fmt.Errorf("usage: tick <seconds>")
		}
		seconds, err := strconv.Atoi(fields[1])
		if err != nil {
			return fmt.Errorf("invalid seconds: %w", err)
		}
		c.Advance(seconds)
	case "status":
	default:
		return fmt.Errorf("unknown command %q", fields[0])
	}
	return nil
}
