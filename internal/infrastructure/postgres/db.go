package postgres

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

// NewDatabase creates a new PostgreSQL database connection
// Time Complexity: O(1)
func NewDatabase(dsn string) (*sql.DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Configure connection pool for high performance
	db.SetMaxOpenConns(100)    // Maximum number of open connections
	db.SetMaxIdleConns(10)     // Maximum number of idle connections
	db.SetConnMaxLifetime(0)   // Connections don't expire

	return db, nil
}
