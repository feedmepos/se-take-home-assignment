package controller

import (
	"time"

	"github.com/urfave/cli/v3"
)

// processingTimeFlagName is the name of the persistent --processing-time/-t
// flag defined on the root command, shared by the interactive and demo
// subcommands.
const processingTimeFlagName = "processing-time"

// NewRootCommand builds the "feedme" root CLI command: a persistent
// --processing-time/-t flag (sourced from the FEEDME_PROCESSING_TIME env
// var, falling back to defaultProcessingTime — which the caller typically
// derives from its own config loading), plus the "interactive" and "demo"
// subcommands. wire is the composition-root factory, supplied by the
// caller (cmd/api/main.go), used to construct the concrete usecase ports
// once the effective processing time is known at Action time.
func NewRootCommand(version string, defaultProcessingTime time.Duration, wire WireFunc) *cli.Command {
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
			NewInteractiveCommand(wire),
			NewDemoCommand(wire),
		},
	}
}
