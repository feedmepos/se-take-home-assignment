package simulation

// SimulationController defines the contract for business operations
// that can be orchestrated by simulation workflows.
// This interface is presentation-agnostic - it only exposes business operations,
// not display/formatting concerns.
type SimulationController interface {
	// Order operations
	CreateNormalOrder() error
	CreateVIPOrder() error

	// Bot operations
	AddBot() error
	RemoveBot() error

	// Processing operations
	ProcessPendingOrders()
}

func BasicOrderFlow(ctrl SimulationController) {
	ctrl.CreateNormalOrder()
	ctrl.AddBot()
	ctrl.ProcessPendingOrders()
}

func VIPPriority(ctrl SimulationController) {
	ctrl.CreateNormalOrder()
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.ProcessPendingOrders()
}

func BotRemovalMidProcessing(ctrl SimulationController) {
	ctrl.CreateNormalOrder()
	ctrl.CreateNormalOrder()
	ctrl.AddBot()
	ctrl.RemoveBot()
}

func MultipleVIPOrdering(ctrl SimulationController) {
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.AddBot()
	ctrl.ProcessPendingOrders()
}

func BotIdleBehavior(ctrl SimulationController) {
	ctrl.AddBot()
	ctrl.CreateNormalOrder()
	ctrl.ProcessPendingOrders()
}
