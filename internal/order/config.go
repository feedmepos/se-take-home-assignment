package order

import "time"

// Config holds runtime settings for the order controller.
type Config struct {
	// ProcessDuration is how long a bot takes to complete one order.
	// Default is 10s; tests typically use a shorter value.
	ProcessDuration time.Duration
}

// DefaultConfig returns production settings.
func DefaultConfig() Config {
	return Config{
		ProcessDuration: 10 * time.Second,
	}
}
