package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Mode represents the operational mode of the application
type Mode string

const (
	ModeMemory   Mode = "memory"
	ModeDatabase Mode = "database"
)

// Environment represents the application environment
type Environment string

const (
	EnvDevelopment Environment = "development"
	EnvStaging     Environment = "staging"
	EnvProduction  Environment = "production"
)

// Config holds all application configuration
// Following Single Responsibility Principle: only manages configuration
type Config struct {
	// Application mode (memory or database)
	Mode Mode

	// Application environment (development, staging, production)
	Environment Environment

	// Server configuration
	ServerPort string

	// Database configuration
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// Order processing configuration
	OrderServingDuration time.Duration

	// Worker configuration
	InitialCookBots int

	// Logging configuration
	LogDirectory string
}

// Load loads configuration from environment variables and .env file
// Time Complexity: O(1) - reads fixed number of environment variables
func Load() (*Config, error) {
	// Load .env file if it exists (non-critical if it doesn't exist)
	_ = godotenv.Load()

	config := &Config{
		Mode:                 Mode(getEnv("MODE", "memory")),
		Environment:          Environment(getEnv("ENV", "development")),
		ServerPort:           getEnv("SERVER_PORT", "8080"),
		DBHost:               getEnv("DB_HOST", "localhost"),
		DBPort:               getEnv("DB_PORT", "7001"),
		DBUser:               getEnv("DB_USER", "postgres"),
		DBPassword:           getEnv("DB_PASSWORD", "postgres"),
		DBName:               getEnv("DB_NAME", "mcmocknald"),
		DBSSLMode:            getEnv("DB_SSL_MODE", "disable"),
		OrderServingDuration: getDurationEnv("ORDER_SERVING_DURATION", 10*time.Second),
		InitialCookBots:      getIntEnv("INITIAL_COOK_BOTS", 1),
		LogDirectory:         getEnv("LOG_DIRECTORY", "./logs"),
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return config, nil
}

// Validate validates the configuration
// Time Complexity: O(1) - checks fixed number of fields
func (c *Config) Validate() error {
	if c.Mode != ModeMemory && c.Mode != ModeDatabase {
		return fmt.Errorf("invalid mode: %s (must be 'memory' or 'database')", c.Mode)
	}

	if c.Mode == ModeDatabase {
		if c.DBHost == "" {
			return fmt.Errorf("DB_HOST is required in database mode")
		}
		if c.DBPort == "" {
			return fmt.Errorf("DB_PORT is required in database mode")
		}
		if c.DBUser == "" {
			return fmt.Errorf("DB_USER is required in database mode")
		}
		if c.DBPassword == "" {
			return fmt.Errorf("DB_PASSWORD is required in database mode")
		}
		if c.DBName == "" {
			return fmt.Errorf("DB_NAME is required in database mode")
		}

		// Production-specific validations
		if c.IsProduction() {
			// Reject default/weak credentials in production
			if c.DBUser == "postgres" && c.DBPassword == "postgres" {
				return fmt.Errorf("default credentials (postgres/postgres) are not allowed in production")
			}
			if len(c.DBPassword) < 12 {
				return fmt.Errorf("database password must be at least 12 characters in production")
			}
			// Enforce SSL in production
			if c.DBSSLMode == "disable" {
				return fmt.Errorf("SSL must be enabled in production (DB_SSL_MODE cannot be 'disable')")
			}
		}
	}

	if c.OrderServingDuration <= 0 {
		return fmt.Errorf("ORDER_SERVING_DURATION must be positive")
	}

	if c.InitialCookBots < 0 {
		return fmt.Errorf("INITIAL_COOK_BOTS must be non-negative")
	}

	return nil
}

// GetDatabaseDSN returns the PostgreSQL connection string
// Time Complexity: O(1)
func (c *Config) GetDatabaseDSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode,
	)
}

// IsMemoryMode checks if the application is running in memory mode
// Time Complexity: O(1)
func (c *Config) IsMemoryMode() bool {
	return c.Mode == ModeMemory
}

// IsDatabaseMode checks if the application is running in database mode
// Time Complexity: O(1)
func (c *Config) IsDatabaseMode() bool {
	return c.Mode == ModeDatabase
}

// IsProduction checks if the application is running in production environment
// Time Complexity: O(1)
func (c *Config) IsProduction() bool {
	return c.Environment == EnvProduction
}

// IsSwaggerEnabled checks if Swagger should be enabled (non-production environments)
// Time Complexity: O(1)
func (c *Config) IsSwaggerEnabled() bool {
	return !c.IsProduction()
}

// Helper functions for environment variable parsing

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getIntEnv(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	intValue, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}

	return intValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	duration, err := time.ParseDuration(value)
	if err != nil {
		return defaultValue
	}

	return duration
}
