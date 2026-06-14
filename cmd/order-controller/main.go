package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"

	"order-controller/internal/controller"
)

func main() {
	demo := flag.Bool("demo", false, "run the scripted demo")
	interactive := flag.Bool("i", false, "run the interactive CLI")
	duration := flag.Duration("duration", controller.DefaultProcessDuration, "order processing duration")
	flag.Parse()

	logger := newLogger(os.Stdout)
	c := controller.New(controller.Options{
		ProcessDuration: *duration,
		OnEvent:         logger.event,
	})

	if *demo {
		runDemo(c, logger)
		return
	}

	if *interactive || !*demo {
		runInteractive(c, logger, os.Stdin)
	}
}

type logger struct {
	mu  sync.Mutex
	out io.Writer
}

func newLogger(out io.Writer) *logger {
	return &logger{out: out}
}

func (l *logger) event(event controller.Event) {
	switch event.Type {
	case controller.EventOrderCreated:
		l.printf("%s Order #%d -> PENDING", event.Order.Kind, event.Order.ID)
	case controller.EventBotCreated:
		l.printf("Bot #%d created", event.BotID)
	case controller.EventOrderPicked:
		l.printf("Bot #%d picked up %s Order #%d -> PROCESSING", event.BotID, event.Order.Kind, event.Order.ID)
	case controller.EventOrderCompleted:
		l.printf("Bot #%d completed %s Order #%d -> COMPLETE", event.BotID, event.Order.Kind, event.Order.ID)
	case controller.EventBotIdle:
		l.printf("Bot #%d is IDLE", event.BotID)
	case controller.EventBotRemoved:
		l.printf("Bot #%d destroyed", event.BotID)
	case controller.EventOrderRequeued:
		l.printf("%s Order #%d returned to PENDING", event.Order.Kind, event.Order.ID)
	case controller.EventNoBotToRemove:
		l.printf("No bots to destroy")
	}
}

func (l *logger) printf(format string, args ...any) {
	l.mu.Lock()
	defer l.mu.Unlock()
	fmt.Fprintf(l.out, "[%s] %s\n", time.Now().Format("15:04:05"), fmt.Sprintf(format, args...))
}

func runDemo(c *controller.Controller, log *logger) {
	log.printf("Demo started")
	c.AddOrder(controller.Normal)
	c.AddOrder(controller.Normal)
	c.AddOrder(controller.VIP)
	c.AddBot()
	c.AddBot()
	time.Sleep(time.Second)
	c.RemoveBot()
	c.AddBot()
	if !c.WaitDrained(45 * time.Second) {
		log.printf("Demo timed out before all orders completed")
	}
	printSnapshot(log, c.Snapshot())
	log.printf("Demo completed")
}

func runInteractive(c *controller.Controller, log *logger, in io.Reader) {
	log.printf("Interactive CLI ready. Commands: normal, vip, +bot, -bot, status, quit")
	scanner := bufio.NewScanner(in)
	for {
		fmt.Fprint(os.Stdout, "> ")
		if !scanner.Scan() {
			log.printf("Input closed")
			return
		}
		if executeCommand(strings.TrimSpace(scanner.Text()), c, log) {
			return
		}
	}
}

func executeCommand(input string, c *controller.Controller, log *logger) bool {
	cmd := strings.ToLower(strings.TrimSpace(input))
	switch cmd {
	case "normal", "n":
		c.AddOrder(controller.Normal)
	case "vip", "v":
		c.AddOrder(controller.VIP)
	case "+bot", "+", "addbot", "add bot":
		c.AddBot()
	case "-bot", "-", "removebot", "remove bot":
		c.RemoveBot()
	case "status", "s":
		printSnapshot(log, c.Snapshot())
	case "quit", "q", "exit":
		log.printf("Stopping bots and exiting")
		c.StopAll()
		return true
	case "":
	default:
		log.printf("Unknown command: %s", cmd)
	}
	return false
}

func printSnapshot(log *logger, snap controller.Snapshot) {
	log.printf("Status: pending=%s processing=%s completed=%s bots=%s",
		formatOrders(snap.Pending),
		formatProcessing(snap.Processing),
		formatOrders(snap.Completed),
		formatBots(snap.Bots),
	)
}

func formatOrders(orders []controller.OrderView) string {
	if len(orders) == 0 {
		return "[]"
	}
	parts := make([]string, 0, len(orders))
	for _, order := range orders {
		parts = append(parts, fmt.Sprintf("%s#%d", order.Kind, order.ID))
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

func formatProcessing(items []controller.ProcessingView) string {
	if len(items) == 0 {
		return "[]"
	}
	parts := make([]string, 0, len(items))
	for _, item := range items {
		parts = append(parts, fmt.Sprintf("Bot#%d:%s#%d", item.BotID, item.Order.Kind, item.Order.ID))
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

func formatBots(bots []controller.BotView) string {
	if len(bots) == 0 {
		return "[]"
	}
	parts := make([]string, 0, len(bots))
	for _, bot := range bots {
		if bot.OrderID == 0 {
			parts = append(parts, fmt.Sprintf("Bot#%d:%s", bot.ID, bot.Status))
			continue
		}
		parts = append(parts, fmt.Sprintf("Bot#%d:%s(Order#%d)", bot.ID, bot.Status, bot.OrderID))
	}
	return "[" + strings.Join(parts, ", ") + "]"
}
