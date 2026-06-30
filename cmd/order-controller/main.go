package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/ptrbug/se-take-home-assignment/internal/controller"
)

func main() {
	command := "demo"
	if len(os.Args) > 1 {
		command = strings.ToLower(os.Args[1])
	}

	var err error
	switch command {
	case "demo":
		err = runDemo(os.Stdout)
	case "interactive":
		err = runInteractive(os.Stdin, os.Stdout)
	case "help", "-h", "--help":
		printUsage(os.Stdout)
	default:
		printUsage(os.Stderr)
		err = fmt.Errorf("unknown command %q", command)
	}

	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func runDemo(out io.Writer) error {
	service := controller.StartService()
	defer service.Close()

	printLogs(out, []controller.LogEntry{{At: time.Now(), Message: "McDonald's Order Management System - Simulation Results"}})
	if err := printSystemRequest(out, service, controller.SystemRequest{Type: controller.SystemInitialize}); err != nil {
		return err
	}
	if err := printClientRequest(out, service, controller.ClientRequest{Type: controller.ClientCreateNormalOrder}); err != nil {
		return err
	}
	if err := printClientRequest(out, service, controller.ClientRequest{Type: controller.ClientCreateVIPOrder}); err != nil {
		return err
	}
	if err := printClientRequest(out, service, controller.ClientRequest{Type: controller.ClientCreateNormalOrder}); err != nil {
		return err
	}
	if err := printManagerRequest(out, service, controller.ManagerRequest{Type: controller.ManagerAddBot}); err != nil {
		return err
	}
	if err := printManagerRequest(out, service, controller.ManagerRequest{Type: controller.ManagerAddBot}); err != nil {
		return err
	}

	time.Sleep(1 * time.Second)
	if err := printManagerRequest(out, service, controller.ManagerRequest{Type: controller.ManagerRemoveBot}); err != nil {
		return err
	}
	if err := printClientRequest(out, service, controller.ClientRequest{Type: controller.ClientCreateVIPOrder}); err != nil {
		return err
	}
	if err := printManagerRequest(out, service, controller.ManagerRequest{Type: controller.ManagerAddBot}); err != nil {
		return err
	}

	if err := printAsyncUntilCompleted(out, service, 4, 25*time.Second); err != nil {
		return err
	}
	if err := printManagerRequest(out, service, controller.ManagerRequest{Type: controller.ManagerRemoveBot}); err != nil {
		return err
	}
	if err := printClientRequest(out, service, controller.ClientRequest{Type: controller.ClientSummary}); err != nil {
		return err
	}

	return nil
}

func runInteractive(in io.Reader, out io.Writer) error {
	service := controller.StartService()
	defer service.Close()

	fmt.Fprintln(out, "McDonald's Order Management System - Interactive CLI")
	fmt.Fprintln(out, "Commands: normal, vip, +bot, -bot, status, help, quit")

	inputs := make(chan string)
	errs := make(chan error, 1)
	go scanInput(in, out, inputs, errs)

	for {
		select {
		case logs, ok := <-service.Logs():
			if ok {
				printLogs(out, logs)
			}
		case text, ok := <-inputs:
			if !ok {
				return <-errs
			}

			quit, err := handleInteractiveCommand(service, out, text, time.Now())
			if err != nil {
				return err
			}
			if quit {
				return nil
			}
		}
	}
}

func scanInput(in io.Reader, out io.Writer, inputs chan<- string, errs chan<- error) {
	scanner := bufio.NewScanner(in)
	for {
		fmt.Fprint(out, "> ")
		if !scanner.Scan() {
			errs <- scanner.Err()
			close(inputs)
			return
		}
		inputs <- scanner.Text()
	}
}

func handleInteractiveCommand(service *controller.Service, out io.Writer, text string, now time.Time) (bool, error) {
	text = strings.ToLower(strings.TrimSpace(text))

	var response controller.Response
	var responseErr error
	var quit bool
	switch text {
	case "normal", "n":
		response, responseErr = service.HandleClientRequest(context.Background(), controller.ClientRequest{Type: controller.ClientCreateNormalOrder, At: now})
	case "vip", "v":
		response, responseErr = service.HandleClientRequest(context.Background(), controller.ClientRequest{Type: controller.ClientCreateVIPOrder, At: now})
	case "+bot", "addbot", "add bot":
		response, responseErr = service.HandleManagerRequest(context.Background(), controller.ManagerRequest{Type: controller.ManagerAddBot, At: now})
	case "-bot", "removebot", "remove bot":
		response, responseErr = service.HandleManagerRequest(context.Background(), controller.ManagerRequest{Type: controller.ManagerRemoveBot, At: now})
	case "status", "s":
		response, responseErr = service.HandleClientRequest(context.Background(), controller.ClientRequest{Type: controller.ClientStatus, At: now})
	case "help", "h", "?":
		fmt.Fprintln(out, "Commands: normal, vip, +bot, -bot, status, help, quit")
		return false, nil
	case "quit", "exit", "q":
		response, responseErr = service.HandleClientRequest(context.Background(), controller.ClientRequest{Type: controller.ClientSummary, At: now})
		quit = true
	case "":
		return false, nil
	default:
		fmt.Fprintf(out, "Unknown command %q. Type help for commands.\n", text)
		return false, nil
	}

	if responseErr != nil {
		return false, responseErr
	}
	printLogs(out, response.Logs)

	return quit, nil
}

func printUsage(out io.Writer) {
	fmt.Fprintln(out, "Usage: order-controller [demo|interactive]")
}

func printLogs(out io.Writer, logs []controller.LogEntry) {
	for _, log := range logs {
		fmt.Fprintln(out, log.String())
	}
}

func printClientRequest(out io.Writer, service *controller.Service, request controller.ClientRequest) error {
	response, err := service.HandleClientRequest(context.Background(), request)
	if err != nil {
		return err
	}
	printLogs(out, response.Logs)
	return nil
}

func printManagerRequest(out io.Writer, service *controller.Service, request controller.ManagerRequest) error {
	response, err := service.HandleManagerRequest(context.Background(), request)
	if err != nil {
		return err
	}
	printLogs(out, response.Logs)
	return nil
}

func printSystemRequest(out io.Writer, service *controller.Service, request controller.SystemRequest) error {
	response, err := service.HandleSystemRequest(context.Background(), request)
	if err != nil {
		return err
	}
	printLogs(out, response.Logs)
	return nil
}

func printAsyncUntilCompleted(out io.Writer, service *controller.Service, target int, timeout time.Duration) error {
	timer := time.NewTimer(timeout)
	defer timer.Stop()

	completed := 0
	for completed < target {
		select {
		case logs, ok := <-service.Logs():
			if !ok {
				return fmt.Errorf("service stopped before demo completed")
			}
			printLogs(out, logs)
			for _, log := range logs {
				if strings.Contains(log.Message, " completed ") {
					completed++
				}
			}
		case <-timer.C:
			return fmt.Errorf("timed out waiting for %d completed orders; got %d", target, completed)
		}
	}

	return nil
}
