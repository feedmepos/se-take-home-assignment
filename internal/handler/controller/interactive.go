package controller

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"strings"

	"github.com/urfave/cli/v3"

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

// NewInteractiveCommand builds the "interactive" subcommand: a REPL loop
// over the order/bot usecase ports. Wiring (constructing the real usecase
// from --processing-time) is done here so runInteractive itself only
// depends on the OrderUsecase/BotUsecase ports and can be exercised in
// tests with fakes.
func NewInteractiveCommand() *cli.Command {
	return &cli.Command{
		Name:  "interactive",
		Usage: "start an interactive REPL for creating orders and managing bots",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			uc := wire(resolveProcessingTime(cmd))
			return runInteractive(ctx, uc, uc, cmd.Reader, cmd.Writer, cmd.ErrWriter)
		},
	}
}

// runInteractive drives the REPL: it prints a short help banner and prompt
// to errOut, reads whitespace-tokenized commands line-by-line from in (via
// a background goroutine so it can select against ctx.Done()), and renders
// "status" output / the final summary to out. It returns once the user
// exits, stdin is exhausted (EOF), or ctx is cancelled — in every case it
// calls bots.Shutdown() and renders the final summary before returning.
func runInteractive(ctx context.Context, orders OrderUsecase, bots BotUsecase, in io.Reader, out, errOut io.Writer) error {
	fmt.Fprint(errOut, helpText)
	fmt.Fprint(errOut, prompt)

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
			if exit := handleLine(orders, bots, line, out, errOut); exit {
				break loop
			}
			fmt.Fprint(errOut, prompt)
		}
	}

	summary := bots.Shutdown()
	renderFinalSummary(out, summary)
	return nil
}

// handleLine parses and executes a single REPL line. It reports whether the
// REPL should exit.
func handleLine(orders OrderUsecase, bots BotUsecase, line string, out, errOut io.Writer) (exit bool) {
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
		case "normal":
			orders.NewNormalOrder()
		case "vip":
			orders.NewVIPOrder()
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
			bots.AddBot()
		case "remove", "-":
			if _, err := bots.RemoveBot(); err != nil {
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
		renderStatus(out, orders.Status())

	case "help":
		fmt.Fprint(errOut, helpText)

	case "exit", "quit":
		return true

	default:
		fmt.Fprintln(errOut, usageHint)
	}

	return false
}
