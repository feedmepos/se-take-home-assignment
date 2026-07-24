package main

import (
	"fmt"

	"feedme/internal/kitchen"
)

func main() {
	k := kitchen.New()

	k.AddBot() // bot #1

	k.AddOrder(kitchen.Normal) // order #1 (will be process as the first order since VIP order is not created yet)
	k.AddOrder(kitchen.Normal) // order #2
	k.AddOrder(kitchen.VIP)    // order #3 (will be process BEFORE order #2 because VIP order has priority)
	k.AddOrder(kitchen.VIP)    // order #4

	k.AddBot() // bot #2

	k.RemoveBot() // remove bot #2

	k.WaitUntilIdle()

	fmt.Print(k.Result())
}
