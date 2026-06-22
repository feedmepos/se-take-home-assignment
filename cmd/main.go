package main

import (
	"fmt"
	"os"

	"se-take-home-assignment/internal/sim"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] != "demo" {
		fmt.Fprintf(os.Stderr, "unknown mode %q; use demo\n", os.Args[1])
		os.Exit(1)
	}

	if err := sim.RunDemo(os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
