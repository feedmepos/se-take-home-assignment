package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"sync"
	"time"

	"github.com/dnisting/se-take-home-assignment/internal/cli"
	"github.com/dnisting/se-take-home-assignment/internal/controller"
	"github.com/dnisting/se-take-home-assignment/internal/models"
)

var w io.Writer
var mu sync.Mutex

func main() {
	interactiveFlag := flag.Bool("interactive", false, "Run in interactive CLI mode instead of simulation")
	flag.Parse()

	// Determine filename based on mode
	var filename string
	if *interactiveFlag {
		filename = "scripts/result_interactive.txt"
	} else {
		filename = "scripts/result_simulation.txt"
	}

	// Auto-save output to appropriate file
	file, err := os.Create(filename)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Warning: could not create %s: %v (writing to terminal only)\n", filename, err)
		file = nil
	}
	if file != nil {
		defer file.Close()
	}

	// Write to both terminal and file simultaneously
	if file != nil {
		w = io.MultiWriter(os.Stdout, file)
	} else {
		w = os.Stdout
	}

	logFunc := createLogFunc()

	if *interactiveFlag {
		c := controller.New(logFunc)
		cli.RunInteractive(c, logFunc)
	} else {
		cli.RunSimulation(logFunc)
	}
}

// createLogFunc returns a thread-safe logging function.
func createLogFunc() models.LogFunc {
	return func(format string, args ...any) {
		mu.Lock()
		defer mu.Unlock()
		ts := time.Now().Format("15:04:05")
		fmt.Fprintf(w, "[%s] %s\n", ts, fmt.Sprintf(format, args...))
	}
}
