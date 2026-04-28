package app

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"

	"se-take-home-assignment/internal/domain"
)

// CLI provides a tiny interactive shell for the order controller.
type CLI struct {
	in          io.Reader
	out         io.Writer
	controller  *domain.Controller
	interactive bool
}

// NewCLI creates a CLI runtime with injected I/O for testability.
func NewCLI(in io.Reader, out io.Writer, controller *domain.Controller) *CLI {
	interactive := false
	if f, ok := in.(*os.File); ok {
		if info, err := f.Stat(); err == nil && (info.Mode()&os.ModeCharDevice) != 0 {
			interactive = true
		}
	}
	return &CLI{
		in:          in,
		out:         out,
		controller:  controller,
		interactive: interactive,
	}
}

// Run starts the command loop until "exit" or EOF.
func (c *CLI) Run() error {
	scanner := bufio.NewScanner(c.in)
	if c.interactive {
		fmt.Fprintln(c.out, "Order Controller CLI")
		fmt.Fprintln(c.out, "Type \"help\" for available commands.")
	}
	for {
		if c.interactive {
			fmt.Fprint(c.out, "> ")
		}
		if !scanner.Scan() {
			return nil
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		if err := c.handleLine(line); err != nil {
			return err
		}
	}
}

func (c *CLI) handleLine(line string) error {
	parts := strings.Fields(strings.ToLower(line))
	if len(parts) == 0 {
		return nil
	}

	switch {
	case len(parts) == 1 && parts[0] == "help":
		c.printHelp()
	case len(parts) == 1 && parts[0] == "status":
		c.printStatus()
	case len(parts) == 1 && parts[0] == "summary":
		c.printSummary()
	case len(parts) == 2 && parts[0] == "add" && parts[1] == "bot":
		c.controller.AddBot()
	case len(parts) == 2 && parts[0] == "remove" && parts[1] == "bot":
		if err := c.controller.RemoveLatestBot(); err != nil {
			fmt.Fprintf(c.out, "error: %v\n", err)
		}
	case len(parts) == 2 && parts[0] == "new" && parts[1] == "normal":
		c.controller.NewNormalOrder()
	case len(parts) == 2 && parts[0] == "new" && parts[1] == "vip":
		c.controller.NewVIPOrder()
	case len(parts) == 2 && parts[0] == "sleep":
		seconds, err := strconv.Atoi(parts[1])
		if err != nil || seconds < 0 {
			fmt.Fprintln(c.out, "error: sleep expects non-negative integer seconds")
			return nil
		}
		time.Sleep(time.Duration(seconds) * time.Second)
	case len(parts) == 1 && parts[0] == "exit":
		return io.EOF
	default:
		fmt.Fprintf(c.out, "unknown command: %s\n", line)
	}
	return nil
}

func (c *CLI) printHelp() {
	fmt.Fprintln(c.out, "Commands:")
	fmt.Fprintln(c.out, "  new normal   - create a normal order")
	fmt.Fprintln(c.out, "  new vip      - create a VIP order")
	fmt.Fprintln(c.out, "  add bot      - add one cooking bot")
	fmt.Fprintln(c.out, "  remove bot   - remove latest cooking bot")
	fmt.Fprintln(c.out, "  status       - print current system snapshot")
	fmt.Fprintln(c.out, "  sleep N      - wait N seconds (for scripted runs)")
	fmt.Fprintln(c.out, "  summary      - print final summary report")
	fmt.Fprintln(c.out, "  help         - print this message")
	fmt.Fprintln(c.out, "  exit         - quit")
}

func (c *CLI) printStatus() {
	snapshot := c.controller.Snapshot()
	fmt.Fprintf(c.out, "[%s] bots: %v\n", time.Now().Format("15:04:05"), snapshot.BotSummaries)
	fmt.Fprintf(c.out, "[%s] pending_vip: %v\n", time.Now().Format("15:04:05"), snapshot.PendingVIPIDs)
	fmt.Fprintf(c.out, "[%s] pending_normal: %v\n", time.Now().Format("15:04:05"), snapshot.PendingNormalIDs)
	fmt.Fprintf(c.out, "[%s] complete: %v\n", time.Now().Format("15:04:05"), snapshot.CompletedOrderIDs)
}

func (c *CLI) printSummary() {
	m := c.controller.Metrics()
	fmt.Fprintln(c.out, "")
	fmt.Fprintln(c.out, "Final Status:")
	fmt.Fprintf(c.out, "- Total Orders Processed: %d (%d VIP, %d Normal)\n", m.TotalOrders, m.TotalVIP, m.TotalNormal)
	fmt.Fprintf(c.out, "- Orders Completed: %d\n", m.Completed)
	fmt.Fprintf(c.out, "- Active Bots: %d\n", m.ActiveBots)
	fmt.Fprintf(c.out, "- Pending Orders: %d\n", m.PendingOrders)
}
