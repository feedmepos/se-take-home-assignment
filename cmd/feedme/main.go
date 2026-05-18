// Package main 为 FeedMe CLI：run-demo（CI）与 interactive（面试）。
package main

import (
	"fmt"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: feedme <run-demo|interactive>")
		os.Exit(2)
	}
	switch os.Args[1] {
	case "run-demo":
		runDemo()
	case "interactive":
		runInteractive()
	default:
		fmt.Fprintf(os.Stderr, "unknown command %q\n", os.Args[1])
		os.Exit(2)
	}
}
