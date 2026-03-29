// main.go
package main

import (
	"order-controller/pkg/controller"
)

func main() {
	sim := controller.NewSimulation()
	sim.Start()
}