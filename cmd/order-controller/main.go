package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/api"
	"github.com/Splinglove/se-take-home-assignment/internal/cli"
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
	"github.com/Splinglove/se-take-home-assignment/web"
)

func main() {
	demo := flag.Bool("demo", false, "run non-interactive demo")
	serve := flag.Bool("serve", false, "serve HTTP API and web UI")
	addr := flag.String("addr", ":8080", "HTTP listen address (with -serve)")
	processTime := flag.Duration("process-time", 10*time.Second, "order processing duration")
	flag.Parse()

	ctrl := controller.New(*processTime, func(msg string) {
		fmt.Fprintln(os.Stdout, cli.FormatLog(time.Now(), msg))
	})

	if *serve {
		srv := api.NewServer(ctrl, web.DistFS())
		fmt.Fprintf(os.Stdout, "Listening on http://localhost%s\n", *addr)
		if err := http.ListenAndServe(*addr, srv.Handler()); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}

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
