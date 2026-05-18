package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"order-controller/internal/restaurant"
)

func main() {
	durStr := flag.String("duration", "10s", "Cook time per order (e.g. 10s, 50ms)")
	interactive := flag.Bool("interactive", false, "Read commands from stdin")
	flag.Parse()

	d, err := time.ParseDuration(*durStr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid -duration: %v\n", err)
		os.Exit(1)
	}

	r := restaurant.New(d)
	log := newTSLogger(os.Stdout)

	if *interactive {
		runInteractive(r, log)
		return
	}

	// Non-interactive scripted output for CI / run.sh.
	runDemo(r, log)
}

type tsLogger struct {
	w io.Writer
}

func newTSLogger(w io.Writer) *tsLogger {
	return &tsLogger{w: w}
}

func (l *tsLogger) printf(format string, args ...interface{}) {
	ts := time.Now().Format("15:04:05")
	_, _ = fmt.Fprintf(l.w, "[%s] ", ts)
	_, _ = fmt.Fprintf(l.w, format+"\n", args...)
}

func formatPending(oo []restaurant.Order) string {
	if len(oo) == 0 {
		return "(none)"
	}
	parts := make([]string, len(oo))
	for i, o := range oo {
		parts[i] = o.String()
	}
	return strings.Join(parts, ", ")
}

func completionWatcher(r *restaurant.Restaurant, log *tsLogger, stop <-chan struct{}) {
	last := 0
	tick := time.NewTicker(2 * time.Millisecond)
	defer tick.Stop()
	for {
		select {
		case <-stop:
			return
		case <-tick.C:
			c := r.CompletedSnapshot()
			if len(c) > last {
				for _, o := range c[last:] {
					log.printf("COMPLETE %s", o.String())
				}
				last = len(c)
			}
		}
	}
}

func runDemo(r *restaurant.Restaurant, log *tsLogger) {
	stop := make(chan struct{})
	go completionWatcher(r, log, stop)
	defer close(stop)

	log.printf("=== McDonald's order controller demo (cook time %v) ===", r.ProcessDuration())

	o1 := r.NewNormalOrder()
	log.printf("New NORMAL order %s", o1.String())
	log.printf("PENDING: %s | COMPLETE: %s", formatPending(r.PendingSnapshot()), formatCompleted(r.CompletedSnapshot()))

	o2 := r.NewNormalOrder()
	log.printf("New NORMAL order %s", o2.String())
	log.printf("PENDING: %s", formatPending(r.PendingSnapshot()))

	o3 := r.NewVIPOrder()
	log.printf("New VIP order %s (queues after existing VIPs, before all normal)", o3.String())
	log.printf("PENDING: %s", formatPending(r.PendingSnapshot()))

	b1 := r.AddBot()
	log.printf("+Bot (bot #%d)", b1)
	time.Sleep(r.ProcessDuration()*3 + 50*time.Millisecond)
	log.printf("PENDING: %s | bots=%d", formatPending(r.PendingSnapshot()), r.BotCount())

	b2 := r.AddBot()
	log.printf("+Bot (bot #%d) — parallel capacity", b2)
	o4 := r.NewNormalOrder()
	log.printf("New NORMAL order %s", o4.String())
	time.Sleep(r.ProcessDuration()*2 + 80*time.Millisecond)
	log.printf("PENDING: %s | COMPLETE count=%d", formatPending(r.PendingSnapshot()), len(r.CompletedSnapshot()))

	log.printf("--- Remove newest bot while orders are in flight (existing bots #%d and #%d) ---", b1, b2)
	r.NewNormalOrder()
	r.NewNormalOrder()
	log.printf("Two new normal orders; each bot picks one")
	time.Sleep(r.ProcessDuration() / 2)
	removed, ok := r.RemoveNewestBot()
	if ok {
		log.printf("-Bot removed newest bot #%d (in-flight order returns to head of its queue)", removed)
	}
	time.Sleep(r.ProcessDuration()*4 + 100*time.Millisecond)
	log.printf("PENDING: %s | COMPLETE: %s", formatPending(r.PendingSnapshot()), formatCompleted(r.CompletedSnapshot()))
	log.printf("Active bots: %d", r.BotCount())

	r.Close()
	log.printf("=== Demo finished ===")
}

func formatCompleted(oo []restaurant.Order) string {
	if len(oo) == 0 {
		return "(none)"
	}
	parts := make([]string, len(oo))
	for i, o := range oo {
		parts[i] = o.String()
	}
	return strings.Join(parts, ", ")
}

func runInteractive(r *restaurant.Restaurant, log *tsLogger) {
	stop := make(chan struct{})
	go completionWatcher(r, log, stop)
	defer close(stop)

	log.printf("Interactive mode. Commands: normal | vip | +bot | -bot | status | quit")
	sc := bufio.NewScanner(os.Stdin)
	for {
		fmt.Fprint(os.Stdout, "> ")
		if !sc.Scan() {
			break
		}
		line := strings.TrimSpace(strings.ToLower(sc.Text()))
		switch line {
		case "quit", "exit", "q":
			r.Close()
			log.printf("Goodbye.")
			return
		case "normal", "n":
			o := r.NewNormalOrder()
			log.printf("New NORMAL %s | PENDING: %s", o.String(), formatPending(r.PendingSnapshot()))
		case "vip", "v":
			o := r.NewVIPOrder()
			log.printf("New VIP %s | PENDING: %s", o.String(), formatPending(r.PendingSnapshot()))
		case "+bot", "bot+", "addbot":
			id := r.AddBot()
			log.printf("+Bot #%d | bots=%d", id, r.BotCount())
		case "-bot", "bot-", "rembot":
			id, ok := r.RemoveNewestBot()
			if ok {
				log.printf("-Bot removed #%d", id)
			} else {
				log.printf("-Bot: no bots to remove")
			}
		case "status", "s":
			log.printf("PENDING: %s | COMPLETE: %s | bots=%d",
				formatPending(r.PendingSnapshot()),
				formatCompleted(r.CompletedSnapshot()),
				r.BotCount())
		case "", "help", "h":
			log.printf("Commands: normal | vip | +bot | -bot | status | quit")
		default:
			log.printf("Unknown command %q (try: help)", line)
		}
	}
	if err := sc.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "stdin: %v\n", err)
	}
	r.Close()
}
