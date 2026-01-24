package interfaces

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
