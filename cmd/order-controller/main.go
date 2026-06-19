package main

import (
	"fmt"
	"os"

	"github.com/feedmepos/se-take-home-assignment/internal/demo"
	"github.com/feedmepos/se-take-home-assignment/internal/tui"
)

func main() {
	mode := "tui"
	if len(os.Args) > 1 {
		mode = os.Args[1]
	}

	var err error
	switch mode {
	case "tui":
		err = tui.Run()
	case "demo":
		err = demo.Run(os.Stdout)
	default:
		err = fmt.Errorf("unknown mode %q; use \"tui\" or \"demo\"", mode)
	}

	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
