// Command feedme is the CLI entry point for the order controller: an
// interactive REPL and a scripted demo over an in-memory order queue
// processed by cooking bots. This file is the composition root — it is
// the only place that imports both the handler layer and the concrete
// infrastructure/repository adapters, wiring them together.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

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

const usage = `usage: feedme [-t duration] <interactive|demo>

subcommands:
  interactive   start the interactive REPL
  demo          run the deterministic scripted demo scenario

flags:
  -t, -processing-time duration
        how long a bot takes to process one order (default from
        FEEDME_PROCESSING_TIME / .env, falling back to 10s)
`

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	defaultProcessingTime := fallbackProcessingTime
	if cfg, err := config.Load(); err != nil {
		fmt.Fprintln(os.Stderr, "warning: failed to load config, using default processing time:", err)
	} else {
		defaultProcessingTime = cfg.ProcessingTime
	}

	var processingTime time.Duration
	flag.DurationVar(&processingTime, "t", defaultProcessingTime, "how long a bot takes to process one order")
	flag.DurationVar(&processingTime, "processing-time", defaultProcessingTime, "how long a bot takes to process one order (long form)")
	flag.Usage = func() { fmt.Fprint(os.Stderr, usage) }
	flag.Parse()

	// Composition root: construct the concrete adapters, wire them into the
	// usecase, and hand the usecase to the API-style controller.
	lg := logger.New(os.Stdout, clock.System{})
	uc := usecase.New(memory.NewOrderRepository(), memory.NewBotRegistry(), clock.System{}, lg, processingTime)
	ctrl := controller.New(uc, uc)

	var err error
	switch flag.Arg(0) {
	case "interactive":
		err = controller.RunInteractive(ctx, ctrl, os.Stdin, os.Stdout, os.Stderr)
	case "demo":
		err = controller.RunDemo(ctx, ctrl, processingTime, os.Stdout)
	default:
		flag.Usage()
		os.Exit(2)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
