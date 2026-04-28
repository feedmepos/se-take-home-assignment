package main

import (
	"errors"
	"fmt"
	"io"
	"os"
	"time"

	"se-take-home-assignment/internal/app"
	"se-take-home-assignment/internal/domain"
)

func main() {
	// We print lifecycle logs to stdout because CI captures stdout into result.txt.
	controller := domain.NewController(10*time.Second, func(format string, args ...any) {
		fmt.Fprintf(os.Stdout, format+"\n", args...)
	})
	fmt.Fprintf(os.Stdout, "[%s] System initialized with 0 bots\n", time.Now().Format("15:04:05"))
	cli := app.NewCLI(os.Stdin, os.Stdout, controller)

	if err := cli.Run(); err != nil && !errors.Is(err, io.EOF) {
		fmt.Fprintf(os.Stderr, "fatal: %v\n", err)
		os.Exit(1)
	}
}
