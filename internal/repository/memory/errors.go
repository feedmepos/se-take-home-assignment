package memory

import "errors"

var (
	ErrNotFound      = errors.New("memory: order not found")
	ErrAlreadyQueued = errors.New("memory: order already in pending queues")
	ErrTierMismatch  = errors.New("memory: tier does not match order")
	ErrNotPending    = errors.New("memory: order is not pending")
	ErrInvalidTier   = errors.New("memory: invalid tier")
	ErrConflict      = errors.New("memory: state conflict or wrong bot")
)
