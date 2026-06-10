// Demo runs a deterministic scripted scenario of the order management system
// and writes the result to result.txt for CI verification.
package main

import (
	"os"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/controller"
)

func main() {
	f, err := os.Create("result.txt")
	if err != nil {
		panic(err)
	}
	defer f.Close()

	c := controller.NewController(f, func() <-chan time.Time {
		return time.After(10 * time.Second)
	})

	// t=0: Init + Normal Order #1001
	c.AddNormalOrder()
	time.Sleep(1 * time.Second)

	// t=1: VIP #1002 + Normal #1003
	c.AddVIPOrder()
	c.AddNormalOrder()
	time.Sleep(1 * time.Second)

	// t=2: Bot #1 takes VIP #1002
	c.AddBot()
	time.Sleep(1 * time.Second)

	// t=3: Bot #2 takes Normal #1001
	c.AddBot()

	// wait until t=12: Bot#1 completes VIP#1002, picks Normal#1003
	time.Sleep(9 * time.Second)

	// t=12-13: Bot#2 completes Normal#1001, goes IDLE
	time.Sleep(2 * time.Second)

	// t=14: VIP #1004 → Bot#2 picks it up
	c.AddVIPOrder()

	// wait until t=22: Bot#1 completes Normal#1003
	time.Sleep(8 * time.Second)

	// t=22-24: Bot#2 completes VIP#1004
	time.Sleep(2 * time.Second)

	// t=24: Remove Bot#2 (IDLE)
	c.RemoveBot()

	// wait until t=26
	time.Sleep(2 * time.Second)
}
