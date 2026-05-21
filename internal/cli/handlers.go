package cli

import (
	"fmt"
)

func (r *Runner) handleNormalAddOrder() {
	r.controller.CreateNormalOrder()
	fmt.Println("Created a normal order.")
}

func (r *Runner) handleAddVIPOrder() {
	r.controller.CreateVIPOrder()
	fmt.Println("Created a VIP order.")
}

func (r *Runner) handleAddBot() {
	bot := r.controller.AddBot()
	fmt.Println("Adding a new bot to the system...", bot.ID)
}

func (r *Runner) handleRemoveBot() {
	r.controller.RemoveBot()
	fmt.Println("Removing a bot from the system...")
}
