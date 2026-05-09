package db

import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

type Database struct {
	*sql.DB
}

func New(path string) (*Database, error) {
	db, err := sql.Open("sqlite3", path)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	if err := initSchema(db); err != nil {
		return nil, err
	}

	return &Database{db}, nil
}

func initSchema(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS orders (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		order_type TEXT NOT NULL CHECK(order_type IN ('NORMAL', 'VIP')),
		status TEXT NOT NULL CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETE')),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS bots (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		status TEXT NOT NULL CHECK(status IN ('IDLE', 'PROCESSING')),
		current_order_id INTEGER,
		processing_started_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (current_order_id) REFERENCES orders(id)
	);

	CREATE TABLE IF NOT EXISTS metadata (
		key TEXT PRIMARY KEY,
		value TEXT
	);
	`

	_, err := db.Exec(schema)
	return err
}

func (d *Database) Close() error {
	return d.DB.Close()
}
