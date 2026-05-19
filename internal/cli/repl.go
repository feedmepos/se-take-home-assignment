package cli

import (
	"bufio"
	"fmt"
	"io"
	"strings"

	"mcd-order-controller/internal/controller"
	"mcd-order-controller/internal/order"
)

type REPL struct {
	C   *controller.Controller
	In  io.Reader
	Out io.Writer
}

func (r *REPL) Run() {
	fmt.Fprintln(r.Out, "McDonald's Order Controller (interactive)")
	r.printHelp()

	sc := bufio.NewScanner(r.In)
	for {
		fmt.Fprint(r.Out, "> ")
		if !sc.Scan() {
			fmt.Fprintln(r.Out)
			return
		}
		line := strings.TrimSpace(sc.Text())
		if line == "" {
			continue
		}
		if !r.dispatch(line) {
			return
		}
	}
}

func (r *REPL) dispatch(line string) bool {
	fields := strings.Fields(strings.ToLower(line))
	cmd := fields[0]

	switch cmd {
	case "help", "h", "?":
		r.printHelp()

	case "normal", "n":
		o := r.C.SubmitOrder(order.Normal)
		fmt.Fprintf(r.Out, "submitted normal order #%d\n", o.ID)

	case "vip", "v":
		o := r.C.SubmitOrder(order.VIP)
		fmt.Fprintf(r.Out, "submitted vip order #%d\n", o.ID)

	case "bot+", "+", "addbot":
		b := r.C.AddBot()
		fmt.Fprintf(r.Out, "added bot #%d\n", b.ID)

	case "bot-", "-", "rmbot":
		b, err := r.C.RemoveBot()
		if err != nil {
			fmt.Fprintf(r.Out, "error: %s\n", err)
			break
		}
		fmt.Fprintf(r.Out, "removed bot #%d\n", b.ID)

	case "status", "s":
		fmt.Fprint(r.Out, controller.FormatSnapshot(r.C.Snapshot()))

	case "quit", "q", "exit":
		r.C.Shutdown()
		fmt.Fprintln(r.Out, "bye")
		return false

	default:
		fmt.Fprintf(r.Out, "unknown command: %q (type 'help')\n", line)
	}
	return true
}

func (r *REPL) printHelp() {
	fmt.Fprintln(r.Out, "commands:")
	fmt.Fprintln(r.Out, "  normal | n        submit a new normal order")
	fmt.Fprintln(r.Out, "  vip    | v        submit a new VIP order")
	fmt.Fprintln(r.Out, "  bot+   | +        add a cooking bot")
	fmt.Fprintln(r.Out, "  bot-   | -        remove the newest cooking bot")
	fmt.Fprintln(r.Out, "  status | s        print current bots / pending / completed")
	fmt.Fprintln(r.Out, "  help   | h        show this help")
	fmt.Fprintln(r.Out, "  quit   | q        exit")
}
