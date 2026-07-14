package controller

import (
	"fmt"
	"strings"

	"feedme-order-controller/internal/handler/dto"
)

// Controller is the API-style handler for the order/bot domain: one method
// per action, each taking a dto request (where relevant) and returning a
// dto response, analogous to a REST controller's endpoint methods. router.go
// (the REPL) and demo.go both drive the same set of Controller methods, so
// the "endpoint" behavior — argument validation, error translation to/from
// the usecase layer, and dto mapping via the presenter — lives in exactly
// one place.
type Controller struct {
	orders OrderUsecase
	bots   BotUsecase
}

// New constructs a Controller over the given order/bot usecase ports.
func New(orders OrderUsecase, bots BotUsecase) *Controller {
	return &Controller{orders: orders, bots: bots}
}

// CreateOrder creates a new order of the requested type. req.Type must be
// "normal" or "vip" (case-insensitive); any other value is rejected with an
// error and no order is created.
func (c *Controller) CreateOrder(req dto.CreateOrderRequest) (dto.OrderView, error) {
	switch strings.ToLower(req.Type) {
	case "normal":
		return toOrderView(c.orders.NewNormalOrder()), nil
	case "vip":
		return toOrderView(c.orders.NewVIPOrder()), nil
	default:
		return dto.OrderView{}, fmt.Errorf("invalid order type %q: want \"normal\" or \"vip\"", req.Type)
	}
}

// AddBot adds a new bot, which immediately begins picking up pending work.
func (c *Controller) AddBot() dto.BotView {
	return toBotView(c.bots.AddBot())
}

// RemoveBot removes the newest bot. The returned error is the usecase
// layer's error verbatim (e.g. usecase.ErrNoBots when there are no bots to
// remove), so callers can match it with errors.Is.
func (c *Controller) RemoveBot() (dto.BotView, error) {
	b, err := c.bots.RemoveBot()
	if err != nil {
		return dto.BotView{}, err
	}
	return toBotView(b), nil
}

// GetStatus returns the current pending queue, bot states, and completed
// count.
func (c *Controller) GetStatus() dto.StatusResponse {
	return toStatusResponse(c.orders.Status())
}

// Shutdown stops all bots and returns the final counters-only summary.
func (c *Controller) Shutdown() dto.SummaryResponse {
	return toSummaryResponse(c.bots.Shutdown())
}
