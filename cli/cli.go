package main

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/feedmepos/se-take-home-assignment/internal/application"
	"github.com/feedmepos/se-take-home-assignment/internal/domain"
	"github.com/feedmepos/se-take-home-assignment/pkg"
)

var errQuit = errors.New("quit")

const help = `available commands:
  order normal   create a Normal order
  order vip      create a VIP order (queued ahead of Normal orders)
  bot add        add a bot; it immediately starts processing PENDING orders
  bot remove     remove the newest bot, returning its in-flight order to PENDING
  quit           exit
`

type CLI struct {
	vipApp    domain.OrderApp
	normalApp domain.OrderApp
	botApp    *application.BotApp
}

func NewCLI(vipApp, normalApp domain.OrderApp, botApp *application.BotApp) *CLI {
	return &CLI{
		vipApp:    vipApp,
		normalApp: normalApp,
		botApp:    botApp,
	}
}

func (c *CLI) Run(fileWriter *pkg.FileWriter) {
	fmt.Print(help)

	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		args := strings.Fields(scanner.Text())
		if len(args) == 0 {
			continue
		}

		if err := c.handle(args, fileWriter); err != nil {
			if errors.Is(err, errQuit) {
				return
			}
			fmt.Println("error handle:", err)
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Println("error reading stdin:", err)
	}
}

func (c *CLI) handle(args []string, fileWriter *pkg.FileWriter) error {
	switch args[0] {
	case "order":
		if len(args) < 2 {
			return errors.New("usage: order <normal|vip>")
		}

		switch args[1] {
		case "normal":
			_, err := c.normalApp.Create(domain.OrderTypeNormal)
			if err != nil {
				return err
			}
		case "vip":
			_, err := c.vipApp.Create(domain.OrderTypeVIP)
			if err != nil {
				return err
			}
		default:
			return errors.New("usage: order <normal|vip>")
		}

	case "bot":
		if len(args) < 2 {
			return errors.New("usage: bot <add|remove>")
		}

		switch args[1] {
		case "add":
			c.botApp.AddBot()
		case "remove":
			err := c.botApp.RemoveBot()
			if err != nil {
				return err
			}
		default:
			return errors.New("usage: bot <add|remove>")
		}

	case "quit":
		c.writeFinalStatus(fileWriter)
		return errQuit

	default:
		return fmt.Errorf("unknown command: %s", args[0])
	}

	return nil
}

func (c *CLI) writeFinalStatus(fileWriter *pkg.FileWriter) {
	var (
		vipCompleted    = c.vipApp.CompletedCount()
		normalCompleted = c.normalApp.CompletedCount()
		totalCompleted  = vipCompleted + normalCompleted
		pendingVIP      = c.vipApp.GetPending()
		pendingNormal   = c.normalApp.GetPending()
	)

	fileWriter.Write("")
	fileWriter.Write("Final Status:")
	fileWriter.Write(fmt.Sprintf("- Total Orders Processed: %d (%d VIP, %d Normal)", totalCompleted, vipCompleted, normalCompleted))
	fileWriter.Write(fmt.Sprintf("- Orders Completed: %d", totalCompleted))
	fileWriter.Write(fmt.Sprintf("- Active Bots: %d", len(c.botApp.ListBot())))
	fileWriter.Write(fmt.Sprintf("- Pending Orders: %d", pendingVIP.Len()+pendingNormal.Len()))
}
