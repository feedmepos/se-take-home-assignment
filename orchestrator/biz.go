package orchestrator

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/se-take-home-assignment/internal/mgr/bot"
	"github.com/se-take-home-assignment/internal/mgr/queue"
	"github.com/se-take-home-assignment/internal/order"
)

var logMu sync.Mutex

func logf(format string, args ...interface{}) {
	logMu.Lock()
	defer logMu.Unlock()
	prefix := time.Now().Format("15:04:05")
	msg := fmt.Sprintf(format, args...)
	fmt.Printf("%s %s\n", prefix, msg)
}

func priorityName(p int) string {
	if p == order.PriorityVIP {
		return "VIP"
	}
	return "Normal"
}

func formatOrders(orders []*order.Order) string {
	if len(orders) == 0 {
		return "[]"
	}
	parts := make([]string, len(orders))
	for i, o := range orders {
		parts[i] = fmt.Sprintf("%s #%d", priorityName(o.Priority()), o.ID())
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

func logState(q queue.OrderQueue) {
	pending := q.PendingOrders()
	processing := q.ProcessingOrders()
	completed := q.CompletedOrders()
	logf("[STATE] Pending: %s | Processing: %s | Completed: %s",
		formatOrders(pending), formatOrders(processing), formatOrders(completed))
}

func logBots(mgr *bot.Manager) {
	bots := mgr.Bots()
	if len(bots) == 0 {
		logf("[BOTS] (none)")
		return
	}
	parts := make([]string, len(bots))
	for i, b := range bots {
		if b.State == bot.Processing && b.CurrentOrder != nil {
			parts[i] = fmt.Sprintf("Bot #%d %s %s #%d", b.ID, b.State,
				priorityName(b.CurrentOrder.Priority()), b.CurrentOrder.ID())
		} else {
			parts[i] = fmt.Sprintf("Bot #%d %s", b.ID, b.State)
		}
	}
	logf("[BOTS] %s", strings.Join(parts, " | "))
}

func readStdin(inputCh chan<- string) {
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		inputCh <- scanner.Text()
	}
	close(inputCh)
}

func Run() {
	logf("[SYSTEM] McDonald's Order Controller started")

	q := queue.New()

	eventCh := make(chan string, 16)
	handler := func(eventType string, o *order.Order, botID int) {
		var msg string
		switch eventType {
		case "processing":
			msg = fmt.Sprintf("[ORDER] %s #%d PROCESSING by Bot #%d",
				priorityName(o.Priority()), o.ID(), botID)
		case "completed":
			msg = fmt.Sprintf("[ORDER] %s #%d COMPLETED",
				priorityName(o.Priority()), o.ID())
		case "recycled":
			msg = fmt.Sprintf("[ORDER] %s #%d RECYCLED to pending",
				priorityName(o.Priority()), o.ID())
		}
		select {
		case eventCh <- msg:
		default:
		}
	}

	mgr := bot.NewManager(q, handler)

	inputCh := make(chan string, 1)
	go readStdin(inputCh)

	prompt := func() {
		fmt.Fprint(os.Stderr, "> ")
	}

	prompt()
	for {
		select {
		case cmd, ok := <-inputCh:
			if !ok {
				mgr.Shutdown()
				return
			}

			cmd = strings.TrimSpace(cmd)
			switch cmd {
			case "n":
				o := order.NewNormal()
				q.Enqueue(o)
				logf("[ORDER] Normal #%d created", o.ID())
				logState(q)
				logBots(mgr)
			case "v":
				o := order.NewVIP()
				q.Enqueue(o)
				logf("[ORDER] VIP #%d created", o.ID())
				logState(q)
				logBots(mgr)
			case "+":
				b := mgr.AddBot()
				logf("[BOT] Bot #%d added", b.ID)
				logState(q)
				logBots(mgr)
			case "-":
				b := mgr.RemoveBot()
				if b != nil {
					logf("[BOT] Bot #%d removed", b.ID)
				}
				logState(q)
				logBots(mgr)
			case "s":
				logState(q)
				logBots(mgr)
			case "w":
				logf("[SYSTEM] Waiting 5 seconds...")
				timer := time.After(5 * time.Second)
			waitLoop:
				for {
					select {
					case msg := <-eventCh:
						logf("%s", msg)
					case <-timer:
						break waitLoop
					}
				}
				logState(q)
				logBots(mgr)
			case "q":
				mgr.Shutdown()
				logf("[SYSTEM] Shutdown complete")
				return
			}
			prompt()

		case msg := <-eventCh:
			logf("%s", msg)
			prompt()
		}
	}
}
