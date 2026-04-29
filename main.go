package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/exc/mcd-order-controller/mcd"
)

func main() {
	demoMode := flag.Bool("demo", false, "Run in demo mode")
	processDuration := flag.Duration("process-duration", 10*time.Second, "Order processing duration")
	flag.Parse()

	if *demoMode {
		mcd.RunDemo(*processDuration)
	} else {
		fmt.Println("McDonald's Order Management System")
		fmt.Println("Type 'help' for available commands")
		fmt.Println()
		mcd.RunREPL(os.Stdin, os.Stdout, *processDuration)
	}
}
