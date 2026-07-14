// Command feedme is the CLI entry point for the order controller: an
// interactive REPL and a scripted demo over an in-memory order queue
// processed by cooking bots. This file is the composition root — it is
// the only place that imports both the handler layer and the concrete
// infrastructure/repository adapters (and the CLI framework), wiring
// them together. The handler layer itself stays framework-free.
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/urfave/cli/v3"

	"feedme-order-controller/infrastructure/clock"
	"feedme-order-controller/infrastructure/config"
	"feedme-order-controller/infrastructure/logger"
	"feedme-order-controller/internal/handler/controller"
	"feedme-order-controller/internal/repository/memory"
	"feedme-order-controller/internal/usecase"
)

// fallbackProcessingTime is used as the flag default only if config.Load()
// itself errors (e.g. a malformed FEEDME_PROCESSING_TIME value) — in the
// normal case the default comes from config.Load()'s own ProcessingTime,
// which already accounts for the env var and .env file.
const fallbackProcessingTime = 10 * time.Second

// wire constructs the concrete adapters for one CLI invocation — the
// timestamped stdout logger, the in-memory repositories, and the usecase —
// and hands them to the API-style controller.
func wire(processingTime time.Duration) *controller.Controller {
	lg := logger.New(os.Stdout, clock.System{})
	uc := usecase.New(memory.NewOrderRepository(), memory.NewBotRegistry(), clock.System{}, lg, processingTime)
	return controller.New(uc, uc)
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	defaultProcessingTime := fallbackProcessingTime
	if cfg, err := config.Load(); err != nil {
		fmt.Fprintln(os.Stderr, "warning: failed to load config, using default processing time:", err)
	} else {
		defaultProcessingTime = cfg.ProcessingTime
	}

	root := &cli.Command{
		Name:  "feedme",
		Usage: "FeedMe order controller — an order queue processed by cooking bots",
		Flags: []cli.Flag{
			&cli.DurationFlag{
				Name:    "processing-time",
				Aliases: []string{"t"},
				Value:   defaultProcessingTime,
				Usage:   "how long a bot takes to process one order",
				Sources: cli.EnvVars("FEEDME_PROCESSING_TIME"),
			},
		},
		Commands: []*cli.Command{
			{
				Name:  "interactive",
				Usage: "start the interactive REPL",
				Action: func(ctx context.Context, cmd *cli.Command) error {
					ctrl := wire(cmd.Duration("processing-time"))
					return controller.RunInteractive(ctx, ctrl, os.Stdin, os.Stdout, os.Stderr)
				},
			},
			{
				Name:  "demo",
				Usage: "run the deterministic scripted demo scenario",
				Action: func(ctx context.Context, cmd *cli.Command) error {
					processingTime := cmd.Duration("processing-time")
					return controller.RunDemo(ctx, wire(processingTime), processingTime, os.Stdout)
				},
			},
		},
	}

	if err := root.Run(ctx, os.Args); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
