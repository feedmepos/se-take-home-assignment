package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"time"

	"mcd-order-controller/internal/cli"
	"mcd-order-controller/internal/controller"
	"mcd-order-controller/internal/sim"
)

func main() {
	mode := flag.String("mode", "interactive", "interactive | simulate")
	out := flag.String("out", "result.txt", "output file (use empty string for stdout only)")
	procTime := flag.Duration("proc-time", 10*time.Second, "per-order cooking time")
	flag.Parse()

	switch *mode {
	case "interactive":
		runInteractive(*out, *procTime)
	case "simulate":
		runSimulate(*out, *procTime)
	default:
		fmt.Fprintf(os.Stderr, "unknown -mode=%q (want interactive|simulate)\n", *mode)
		os.Exit(2)
	}
}

func runInteractive(path string, procTime time.Duration) {
	var w io.Writer = os.Stdout
	if path != "" {
		f, err := os.Create(path)
		if err != nil {
			fmt.Fprintf(os.Stderr, "open %s: %s\n", path, err)
			os.Exit(1)
		}
		defer f.Close()
		w = io.MultiWriter(os.Stdout, f)
	}

	log := controller.NewLogger(time.Now, w)
	c := controller.New(controller.Config{
		ProcessTime: procTime,
		Logger:      log,
	})
	defer c.Shutdown()

	(&cli.REPL{
		C:   c,
		In:  os.Stdin,
		Out: w,
	}).Run()
}

func runSimulate(path string, procTime time.Duration) {
	var w io.Writer = os.Stdout
	if path != "" {
		f, err := os.Create(path)
		if err != nil {
			fmt.Fprintf(os.Stderr, "open %s: %s\n", path, err)
			os.Exit(1)
		}
		defer f.Close()
		w = io.MultiWriter(os.Stdout, f)
	}
	sim.Run(w, procTime)
}
