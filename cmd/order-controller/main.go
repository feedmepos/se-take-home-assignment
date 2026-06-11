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

	"order-controller/internal/controller"
)

const helpText = `Commands:
  normal | n          create a Normal order
  vip    | v          create a VIP order
  +bot   | + | addbot add a cooking bot
  -bot   | - | removebot
                      destroy the newest bot (its order returns to PENDING)
  status | s          print current status summary
  wait N | w N        pause input for N seconds (lets bots progress)
  drain  | d          block until every order is COMPLETE
  help   | h          show this help
  quit   | q | exit   exit`

func main() {
	proc := flag.Duration("process", defaultProcessDuration(), "time a bot takes to process one order (also settable via PROCESS_SECONDS)")
	flag.Parse()

	out := os.Stdout
	fmt.Fprintf(out, "[%s] McDonald's Order Controller started - 0 bots, processing time %s\n",
		time.Now().Format("15:04:05"), *proc)

	c := controller.New(*proc, out)
	if isTerminal(os.Stdin) {
		fmt.Fprintln(out, helpText)
	}
	repl(c, os.Stdin, out)
}

// defaultProcessDuration reads PROCESS_SECONDS (float seconds) so batch
// scripts can accelerate runs without changing flags; -process wins.
func defaultProcessDuration() time.Duration {
	if s := os.Getenv("PROCESS_SECONDS"); s != "" {
		if f, err := strconv.ParseFloat(s, 64); err == nil && f > 0 {
			return time.Duration(f * float64(time.Second))
		}
	}
	return 10 * time.Second
}

func isTerminal(f *os.File) bool {
	info, err := f.Stat()
	return err == nil && info.Mode()&os.ModeCharDevice != 0
}

// repl reads commands line by line. The same parser serves both the
// interactive session and run.sh's piped batch script.
func repl(c *controller.Controller, in io.Reader, out io.Writer) {
	scanner := bufio.NewScanner(in)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		fields := strings.Fields(line)
		switch cmd := strings.ToLower(fields[0]); cmd {
		case "normal", "n":
			c.AddNormalOrder()
		case "vip", "v":
			c.AddVIPOrder()
		case "+bot", "+", "addbot":
			c.AddBot()
		case "-bot", "-", "removebot":
			c.RemoveBot()
		case "status", "s":
			fmt.Fprint(out, c.Status())
		case "wait", "w":
			if len(fields) < 2 {
				fmt.Fprintln(out, "usage: wait N (seconds)")
				continue
			}
			secs, err := strconv.ParseFloat(fields[1], 64)
			if err != nil || secs < 0 {
				fmt.Fprintf(out, "invalid wait duration %q\n", fields[1])
				continue
			}
			time.Sleep(time.Duration(secs * float64(time.Second)))
		case "drain", "d":
			for !c.Drained() {
				time.Sleep(100 * time.Millisecond)
			}
		case "help", "h":
			fmt.Fprintln(out, helpText)
		case "quit", "q", "exit":
			return
		default:
			fmt.Fprintf(out, "unknown command %q (type 'help')\n", cmd)
		}
	}
	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "input error: %v\n", err)
	}
}
