package cli

import (
	"bufio"
	"fmt"
	"io"
	"strings"

	"github.com/KhanitthaK/feedme-backend-service/internal/domain"
	"github.com/KhanitthaK/feedme-backend-service/internal/usecase"
)

// RunREPL runs the interactive command loop, reading commands from in and
// writing timestamped output to out. It reuses a single OrderController.
func RunREPL(in io.Reader, out io.Writer) {
	c := usecase.NewOrderController(usecase.NewRealClock(), usecase.DefaultProcessDuration)

	logf(out, "McDonald's Order Controller — interactive REPL (processing = %s)", usecase.DefaultProcessDuration)
	printHelp(out)

	sc := bufio.NewScanner(in)
	fmt.Fprint(out, "> ")
	for sc.Scan() {
		switch strings.TrimSpace(sc.Text()) {
		case "normal":
			o, _ := c.CreateOrder(domain.OrderTypeNormal)
			logf(out, "created NORMAL order #%d", o.ID)
		case "vip":
			o, _ := c.CreateOrder(domain.OrderTypeVIP)
			logf(out, "created VIP order #%d", o.ID)
		case "+bot":
			b := c.AddBot()
			logf(out, "added bot #%d", b.ID)
		case "-bot":
			id, err := c.RemoveBot()
			if err != nil {
				logf(out, "error: %v", err)
			} else {
				logf(out, "removed bot #%d", id)
			}
		case "status":
			printState(out, c)
		case "help":
			printHelp(out)
		case "quit", "exit":
			logf(out, "shutting down...")
			c.Reset()
			return
		case "":
			// ignore blank lines
		default:
			logf(out, "unknown command %q (type 'help')", strings.TrimSpace(sc.Text()))
		}
		fmt.Fprint(out, "> ")
	}
	// EOF (e.g. piped stdin closed): stop bots cleanly.
	logf(out, "input closed, shutting down...")
	c.Reset()
}

func printHelp(out io.Writer) {
	logf(out, "commands: normal | vip | +bot | -bot | status | help | quit")
}
