package simulation

import (
	"feedme-takehome/domain/interfaces"
)

func BasicOrderFlow(ctrl interfaces.SimulationController) {
	ctrl.CreateNormalOrder()
	ctrl.AddBot()
	ctrl.ProcessPendingOrders()
}

func VIPPriority(ctrl interfaces.SimulationController) {
	ctrl.CreateNormalOrder()
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.ProcessPendingOrders()
}

func BotRemovalMidProcessing(ctrl interfaces.SimulationController) {
	ctrl.CreateNormalOrder()
	ctrl.CreateNormalOrder()
	ctrl.AddBot()
	ctrl.RemoveBot()
}

func MultipleVIPOrdering(ctrl interfaces.SimulationController) {
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.AddBot()
	ctrl.ProcessPendingOrders()
}

func BotIdleBehavior(ctrl interfaces.SimulationController) {
	ctrl.AddBot()
	ctrl.CreateNormalOrder()
	ctrl.ProcessPendingOrders()
}
