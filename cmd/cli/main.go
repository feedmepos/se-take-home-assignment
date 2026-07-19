// Command cli runs either a deterministic scenario (--scenario, used by CI) or
// an interactive REPL (default).
package main

import (
	"os"

	"github.com/KhanitthaK/feedme-backend-service/internal/adapter/cli"
)

func main() {
	scenario := false
	for _, arg := range os.Args[1:] {
		if arg == "--scenario" {
			scenario = true
		}
	}

	if scenario {
		cli.RunScenario(os.Stdout)
		return
	}
	cli.RunREPL(os.Stdin, os.Stdout)
}
