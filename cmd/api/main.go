// Command feedme is the CLI entry point for the order controller: an
// interactive REPL and a scripted demo over an in-memory order queue
// processed by cooking bots. This file is the composition root — it is
// the only place that imports both the handler layer and the concrete
// infrastructure/repository adapters, wiring them together via a
// controller.WireFunc.
package main

import (
	"context"
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

// version is the CLI's reported version. It is a build-time var so it can
// be overridden via -ldflags "-X main.version=...".
var version = "dev"

// fallbackProcessingTime is used as the root command's flag default only
// if config.Load() itself errors (e.g. a malformed FEEDME_PROCESSING_TIME
// value) — in the normal case the flag default comes from config.Load()'s
// own Config.ProcessingTime.
const fallbackProcessingTime = 10 * time.Second

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	defaultProcessingTime := fallbackProcessingTime
	if cfg, err := config.Load(); err != nil {
		fmt.Fprintln(os.Stderr, "warning: failed to load config, using default processing time:", err)
	} else {
		defaultProcessingTime = cfg.ProcessingTime
	}

	// wire is the composition root for a single CLI invocation: it
	// constructs the concrete logger and in-memory repository adapters and
	// wires them into a new usecase.Usecase, satisfying both of the
	// controller's OrderUsecase/BotUsecase ports.
	wire := func(processingTime time.Duration) (controller.OrderUsecase, controller.BotUsecase) {
		lg := logger.New(os.Stdout, clock.System{})
		orders := memory.NewOrderRepository()
		bots := memory.NewBotRegistry()
		uc := usecase.New(orders, bots, clock.System{}, lg, processingTime)
		return uc, uc
	}

	cmd := controller.NewRootCommand(version, defaultProcessingTime, wire)
	if err := cmd.Run(ctx, os.Args); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
