package controller

import (
	"os"
	"time"

	"github.com/urfave/cli/v3"

	"feedme-order-controller/infrastructure/clock"
	"feedme-order-controller/infrastructure/config"
	"feedme-order-controller/infrastructure/logger"
	"feedme-order-controller/internal/repository/memory"
	"feedme-order-controller/internal/usecase"
)

// processingTimeFlagName is the name of the persistent --processing-time/-t
// flag defined on the root command, shared by the interactive and demo
// subcommands.
const processingTimeFlagName = "processing-time"

// defaultProcessingTime mirrors infrastructure/config's built-in default,
// used only as the CLI flag's own fallback value (i.e. what applies if
// neither the flag/env var nor config.Load() supply anything, which in
// practice only happens if config.Load() itself errors).
const defaultProcessingTime = 10 * time.Second

// NewRootCommand builds the "feedme" root CLI command: a persistent
// --processing-time/-t flag (sourced from the FEEDME_PROCESSING_TIME env
// var), plus the "interactive" and "demo" subcommands.
func NewRootCommand(version string) *cli.Command {
	return &cli.Command{
		Name:    "feedme",
		Usage:   "FeedMe order controller — an order queue processed by cooking bots",
		Version: version,
		Flags: []cli.Flag{
			&cli.DurationFlag{
				Name:    processingTimeFlagName,
				Aliases: []string{"t"},
				Value:   defaultProcessingTime,
				Usage:   "how long a bot takes to process one order",
				Sources: cli.EnvVars("FEEDME_PROCESSING_TIME"),
			},
		},
		Commands: []*cli.Command{
			NewInteractiveCommand(),
			NewDemoCommand(),
		},
	}
}

// resolveProcessingTime returns the processing time to use for a run.
// Precedence: the --processing-time/-t flag (which itself already resolves
// its FEEDME_PROCESSING_TIME env source) if explicitly set; otherwise
// infrastructure/config.Load() (.env file + real env var, defaulting to
// 10s) if it loads successfully; otherwise the flag's own default value.
func resolveProcessingTime(cmd *cli.Command) time.Duration {
	if cmd.IsSet(processingTimeFlagName) {
		return cmd.Duration(processingTimeFlagName)
	}
	if cfg, err := config.Load(); err == nil {
		return cfg.ProcessingTime
	}
	return cmd.Duration(processingTimeFlagName)
}

// wire is the composition root for a single CLI invocation: it constructs
// the concrete logger and in-memory repository adapters and wires them into
// a new usecase.Usecase.
//
// Note: importing internal/repository/memory from the handler layer is a
// deliberate, pragmatic exception to the usual dependency direction —
// something has to construct the concrete adapters that satisfy the
// usecase's ports, and this file (the composition root) is that place. The
// usecase and repository packages themselves have no knowledge of each
// other or of this package.
func wire(processingTime time.Duration) *usecase.Usecase {
	lg := logger.New(os.Stdout, clock.System{})
	orders := memory.NewOrderRepository()
	bots := memory.NewBotRegistry()
	return usecase.New(orders, bots, clock.System{}, lg, processingTime)
}
