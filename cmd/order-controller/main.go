package main

import (
	"context"
	"log"
	"os"

	"github.com/urfave/cli/v3"
	ordercli "order-controller/internal/cli"
)

func main() {
	cmd := &cli.Command{
		Name:  "order-controller",
		Usage: "McDonald's order controller CLI",
		Flags: []cli.Flag{
			&cli.BoolFlag{
				Name:  "demo",
				Usage: "run the deterministic demo scenario",
			},
		},
		Action: func(ctx context.Context, cmd *cli.Command) error {
			if cmd.Bool("demo") {
				return ordercli.RunDemo(os.Stdout)
			}
			return ordercli.RunInteractive(os.Stdin, os.Stdout)
		},
	}

	if err := cmd.Run(context.Background(), os.Args); err != nil {
		log.Fatal(err)
	}
}
