// Command feedme is the CLI entry point for the order controller: an
// interactive REPL and a scripted demo over an in-memory order queue
// processed by cooking bots.
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"feedme-order-controller/internal/handler/controller"
)

// version is the CLI's reported version. It is a build-time var so it can
// be overridden via -ldflags "-X main.version=...".
var version = "dev"

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cmd := controller.NewRootCommand(version)
	if err := cmd.Run(ctx, os.Args); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
