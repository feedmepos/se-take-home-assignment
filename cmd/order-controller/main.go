package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/cli"
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
)

func main() {
	demo := flag.Bool("demo", false, "run non-interactive demo")
	processTime := flag.Duration("process-time", 10*time.Second, "order processing duration")
	flag.Parse()

	ctrl := controller.New(*processTime, func(msg string) {
		fmt.Fprintln(os.Stdout, cli.FormatLog(time.Now(), msg))
	})
	app := cli.New(ctrl, os.Stdin, os.Stdout)

	if *demo {
		if err := app.RunDemo(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}
	if err := app.RunInteractive(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
