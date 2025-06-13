package errdef

import "errors"

var (
	ErrOrderPriorityInvalid error = errors.New("Invalid order priority")
	ErrOrderStatusNotMatch  error = errors.New("Order status does not match")
	ErrOrderNotFound        error = errors.New("Order not found")

	ErrBotNotFound         error = errors.New("Bot not found")
	ErrBotStatusNotIdle    error = errors.New("Bot status is not idle")
	ErrBotStatusNotCooking error = errors.New("Bot status is not cooking")
)
