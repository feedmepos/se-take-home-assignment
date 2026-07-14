// Package controller implements the CLI-facing handler layer: it adapts
// the usecase layer's business operations to a REPL ("interactive") and a
// scripted demo. It depends only on its own OrderUsecase/BotUsecase ports
// and a WireFunc factory injected by the caller — the actual composition
// root (constructing the concrete adapters that back those ports) lives in
// cmd/api/main.go, outside this package.
package controller

import (
	"time"

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

// WireFunc constructs the concrete OrderUsecase/BotUsecase ports for a
// single CLI invocation, given the effective processing time (resolved
// from the --processing-time/-t flag, which itself already accounts for
// the FEEDME_PROCESSING_TIME env var and config default). The controller
// package never implements WireFunc itself — the real composition root
// (constructing the concrete logger, storage, and usecase adapters) lives
// in cmd/api/main.go and is injected here so this package stays free of
// any adapter-level imports.
type WireFunc func(processingTime time.Duration) (OrderUsecase, BotUsecase)
