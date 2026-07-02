package main

import (
	"fmt"
	"os"

	"se-take-home-assignment/internal/cli"
	"se-take-home-assignment/internal/sim"
)

func main() {
	mode := "interactive"
	if len(os.Args) > 1 {
		mode = os.Args[1]
	}

	var err error
	switch mode {
	case "demo":
		err = sim.RunDemo(os.Stdout)
	case "interactive", "cli":
		err = cli.Run(os.Stdin, os.Stdout)
	case "help", "--help", "-h":
		fmt.Fprintln(os.Stdout, "usage: order-controller [demo|interactive]")
		return
	default:
		fmt.Fprintf(os.Stderr, "unknown mode %q; use demo or interactive\n", mode)
		os.Exit(1)
	}

	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
