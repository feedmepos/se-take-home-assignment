// ABOUTME: Provides the executable entrypoint for the order controller CLI.
// ABOUTME: Dispatches demo and interactive modes to the app package.
package main

import (
	"fmt"
	"io"
	"os"

	"feedme-order-controller/internal/app"
)

func main() {
	os.Exit(run(os.Args[1:], os.Stdin, os.Stdout, os.Stderr))
}

func run(args []string, stdin io.Reader, stdout io.Writer, stderr io.Writer) int {
	mode := "demo"
	if len(args) > 0 {
		mode = args[0]
	}

	var err error
	switch mode {
	case "demo":
		err = app.RunDemo(stdout)
	case "interactive":
		err = app.RunInteractive(stdin, stdout)
	default:
		fmt.Fprintf(stderr, "unknown mode: %s\n", mode)
		return 1
	}

	if err != nil {
		fmt.Fprintf(stderr, "error: %v\n", err)
		return 1
	}
	return 0
}
