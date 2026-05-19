package models

import "time"

// DefaultProcessingTime is the standard time a bot takes to process an order.
const DefaultProcessingTime = 10 * time.Second

// LogFunc is the signature for the logging callback used throughout the system.
type LogFunc func(string, ...any)
