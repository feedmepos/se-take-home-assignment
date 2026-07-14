package controller

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"strings"

	"feedme-order-controller/internal/handler/dto"
	"feedme-order-controller/internal/usecase"
)

// helpText is the short command reference printed at REPL start and on
// "help". It is written to STDERR (never STDOUT) so a piped/redirected
// STDOUT stream only ever contains "status" output and the final summary.
const helpText = `FeedMe interactive mode. Commands:
  order normal   create a Normal order
  order vip      create a VIP order
  bot add        add a bot (alias: bot +)
  bot remove     remove the newest bot (alias: bot -)
  status         show current orders and bots
  help           show this help
  exit, quit     stop and show the final summary
`

// usageHint is printed for blank/unrecognized input.
const usageHint = `unrecognized command; type "help" for the list of commands`

const prompt = "> "

// RunInteractive drives the REPL: it prints a short help banner and prompt
// to errOut, reads whitespace-tokenized commands line-by-line from in (via
// a background goroutine so it can select against ctx.Done()), and renders
// "status" output / the final summary to out. It returns once the user
// exits, stdin is exhausted (EOF), or ctx is cancelled — in every case it
// calls c.Shutdown() and renders the final summary before returning.
//
// RunInteractive is a thin router: it only parses input into commands and
// dispatches each one to the corresponding Controller method (route below)
// — the "router → handler" analogy that names this file. All business
// logic and dto mapping live in the Controller and presenter, not here.
func RunInteractive(ctx context.Context, c *Controller, in io.Reader, out, errOut io.Writer) error {
	fmt.Fprint(errOut, helpText)
	fmt.Fprint(errOut, prompt)

	// Note: if ctx is cancelled while Scan is blocked on a read, this
	// goroutine stays parked until the next line/EOF — the standard
	// un-interruptible-stdin leak, reclaimed at process exit.
	lines := make(chan string)
	go func() {
		defer close(lines)
		scanner := bufio.NewScanner(in)
		for scanner.Scan() {
			select {
			case lines <- scanner.Text():
			case <-ctx.Done():
				return
			}
		}
	}()

loop:
	for {
		select {
		case <-ctx.Done():
			break loop
		case line, ok := <-lines:
			if !ok {
				break loop
			}
			if exit := route(c, line, out, errOut); exit {
				break loop
			}
			fmt.Fprint(errOut, prompt)
		}
	}

	renderFinalSummary(out, c.Shutdown())
	return nil
}

// route parses and dispatches a single REPL line to the corresponding
// Controller method. It reports whether the REPL should exit.
func route(c *Controller, line string, out, errOut io.Writer) (exit bool) {
	fields := strings.Fields(line)
	if len(fields) == 0 {
		return false
	}

	switch strings.ToLower(fields[0]) {
	case "order":
		if len(fields) < 2 {
			fmt.Fprintln(errOut, usageHint)
			return false
		}
		switch strings.ToLower(fields[1]) {
		case "normal", "vip":
			if _, err := c.CreateOrder(dto.CreateOrderRequest{Type: fields[1]}); err != nil {
				fmt.Fprintln(errOut, err)
			}
		default:
			fmt.Fprintln(errOut, usageHint)
		}

	case "bot":
		if len(fields) < 2 {
			fmt.Fprintln(errOut, usageHint)
			return false
		}
		switch strings.ToLower(fields[1]) {
		case "add", "+":
			c.AddBot()
		case "remove", "-":
			if _, err := c.RemoveBot(); err != nil {
				if errors.Is(err, usecase.ErrNoBots) {
					fmt.Fprintln(errOut, "no bots to remove")
				} else {
					fmt.Fprintln(errOut, "error removing bot:", err)
				}
			}
		default:
			fmt.Fprintln(errOut, usageHint)
		}

	case "status":
		renderStatus(out, c.GetStatus())

	case "help":
		fmt.Fprint(errOut, helpText)

	case "exit", "quit":
		return true

	default:
		fmt.Fprintln(errOut, usageHint)
	}

	return false
}
