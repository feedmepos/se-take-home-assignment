// Package controller implements the API-style handler layer: it adapts
// the usecase layer's business operations to a small set of request/
// response methods (one per action, like REST endpoints), plus a thin REPL
// router and a scripted demo that drive those methods. It depends only on
// its own OrderUsecase/BotUsecase ports — the actual composition root
// (constructing the concrete adapters that back those ports) lives in
// cmd/api/main.go, outside this package.
package controller

import (
	"feedme-order-controller/internal/usecase/core"
)

// OrderUsecase is the handler-owned port for order-related operations. It
// is satisfied structurally by *usecase.Usecase; declaring it here (rather
// than importing the usecase's own interface, if any) keeps the controller
// package's dependency on the usecase layer limited to exactly the methods
// it calls, and lets tests supply a fake without touching the real usecase.
type OrderUsecase interface {
	NewNormalOrder() core.Order
	NewVIPOrder() core.Order
	Status() core.Summary
}

// BotUsecase is the handler-owned port for bot lifecycle operations,
// satisfied structurally by *usecase.Usecase.
type BotUsecase interface {
	AddBot() *core.Bot
	RemoveBot() (*core.Bot, error)
	Shutdown() core.Summary
}
