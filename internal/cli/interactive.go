package cli

import (
	"bufio"
	"fmt"
	"io"
	"order-controller/internal/order"
	"strings"
)

var availableCommands = []string{
	"+ normal order",
	"+ vip order",
	"+ bot",
	"- bot",
	"status",
	"help",
	"quit",
}

func RunInteractive(input io.Reader, output io.Writer) error {
	scanner := bufio.NewScanner(input)
	controller := order.NewController()

	if err := printHelp(output); err != nil {
		return err
	}

	for {
		if _, err := fmt.Fprint(output, "\nWhat would you like to do?\n> "); err != nil {
			return err
		}
		if !scanner.Scan() {
			break
		}

		command := strings.TrimSpace(strings.ToLower(scanner.Text()))
		if command == "" {
			continue
		}

		switch command {
		case "+ normal order":
			controller.AddNormalOrder()
		case "+ vip order":
			controller.AddVIPOrder()
		case "+ bot":
			controller.AddBot()
		case "- bot":
			controller.RemoveBot()
		case "status":
			if _, err := fmt.Fprintf(output, "\n%s\n", controller.StatusTable()); err != nil {
				return err
			}
		case "help":
			if _, err := fmt.Fprintln(output); err != nil {
				return err
			}
			if err := printHelp(output); err != nil {
				return err
			}
		case "quit", "exit", "q":
			if _, err := fmt.Fprintf(output, "\n%s\n", controller.FinalStatus()); err != nil {
				return err
			}
			return nil
		default:
			if _, err := fmt.Fprintf(output, "\n%s\n", red(fmt.Sprintf("%q is not a valid command.", command))); err != nil {
				return err
			}
			if err := printHelp(output); err != nil {
				return err
			}
		}
	}

	return scanner.Err()
}

func printHelp(output io.Writer) error {
	if _, err := fmt.Fprintln(output, "Available commands:"); err != nil {
		return err
	}
	return printCommands(output)
}

func printCommands(output io.Writer) error {
	for _, command := range availableCommands {
		if _, err := fmt.Fprintf(output, "> %s\n", command); err != nil {
			return err
		}
	}
	return nil
}

func red(text string) string {
	return "\033[31m" + text + "\033[0m"
}
