package main

import (
	"flag"
	"io"
	"os"
	"time"

	"se-order/src/internal/app"
	"se-order/src/internal/clock"
	"se-order/src/internal/core"
	"se-order/src/internal/output"
)

func main() {
	var inputFile string
	var outputFile string
	flag.StringVar(&inputFile, "input-file", "", "read commands from file")
	flag.StringVar(&outputFile, "output-file", "", "write output to file")
	flag.Parse()

	input := os.Stdin
	interactive := isInteractiveInput(os.Stdin)
	if inputFile != "" {
		file, err := os.Open(inputFile)
		if err != nil {
			_, _ = os.Stderr.WriteString(err.Error() + "\n")
			os.Exit(1)
		}
		defer file.Close()
		input = file
		interactive = false
	}

	var outputTarget io.Writer = os.Stdout
	if outputFile != "" {
		file, err := os.Create(outputFile)
		if err != nil {
			_, _ = os.Stderr.WriteString(err.Error() + "\n")
			os.Exit(1)
		}
		defer file.Close()
		outputTarget = file
	}

	clk := clock.NewFake(time.Date(2026, 4, 16, 10, 0, 0, 0, time.UTC))
	controller := core.NewController(clk, 10*time.Second)
	writer := output.NewWriter(outputTarget)
	runner := app.NewRunner(controller, writer)

	if err := runner.Run(input, interactive); err != nil {
		_, _ = os.Stderr.WriteString(err.Error() + "\n")
		os.Exit(1)
	}
}

func isInteractiveInput(file *os.File) bool {
	fileInfo, err := file.Stat()
	if err != nil {
		return false
	}
	return (fileInfo.Mode() & os.ModeCharDevice) != 0
}
