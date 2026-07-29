package cli

import (
	"bufio"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/controller"
)

type CLI struct {
	ctrl *controller.Controller
	in   io.Reader
	out  io.Writer
}

func New(ctrl *controller.Controller, in io.Reader, out io.Writer) *CLI {
	return &CLI{ctrl: ctrl, in: in, out: out}
}

func FormatLog(now time.Time, msg string) string {
	return fmt.Sprintf("[%s] %s", now.Format("15:04:05"), msg)
}

func (c *CLI) log(msg string) {
	fmt.Fprintln(c.out, FormatLog(time.Now(), msg))
}

func (c *CLI) RunInteractive() error {
	fmt.Fprintln(c.out, "McDonald's Order Controller")
	fmt.Fprintln(c.out, "Commands: n/v/+/- /s/q")
	sc := bufio.NewScanner(c.in)
	fmt.Fprint(c.out, "> ")
	for sc.Scan() {
		if quit := c.HandleLine(sc.Text()); quit {
			return nil
		}
		fmt.Fprint(c.out, "> ")
	}
	return sc.Err()
}

func (c *CLI) HandleLine(line string) bool {
	cmd := strings.TrimSpace(strings.ToLower(line))
	switch cmd {
	case "n", "new normal":
		c.ctrl.CreateNormalOrder()
	case "v", "new vip":
		c.ctrl.CreateVIPOrder()
	case "+", "+bot":
		c.ctrl.AddBot()
	case "-", "-bot":
		if _, ok := c.ctrl.RemoveBot(); !ok {
			c.log("No bots to remove")
		}
	case "s", "status":
		c.printStatus()
	case "q", "quit":
		c.log("Bye")
		return true
	case "":
		// ignore
	default:
		c.log("Unknown command: " + line)
	}
	return false
}

func (c *CLI) printStatus() {
	snap := c.ctrl.Snapshot()
	fmt.Fprintf(c.out, "PENDING (%d):\n", len(snap.Pending))
	for _, o := range snap.Pending {
		fmt.Fprintf(c.out, "  #%d %s\n", o.ID, o.Type)
	}
	fmt.Fprintf(c.out, "COMPLETE (%d):\n", len(snap.Complete))
	for _, o := range snap.Complete {
		fmt.Fprintf(c.out, "  #%d %s\n", o.ID, o.Type)
	}
	fmt.Fprintf(c.out, "BOTS (%d):\n", len(snap.Bots))
	for _, b := range snap.Bots {
		cur := "none"
		if b.CurrentOrder != nil {
			cur = fmt.Sprintf("#%d", b.CurrentOrder.ID)
		}
		fmt.Fprintf(c.out, "  Bot #%d %s order=%s\n", b.ID, b.Status, cur)
	}
}
