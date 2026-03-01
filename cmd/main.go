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

	// write to scripts/result.txt
	file, err := os.Create("scripts/result.txt")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Warning: could not create scripts/result.txt: %v (writing to terminal only)\n", err)
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
		logFunc("=== INTERACTIVE MODE ===")
		cli.RunInteractive(c, logFunc)
	} else {
		logFunc("=== SIMULATION MODE ===")
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
