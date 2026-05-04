package services

import (
	"database/sql"
	"order-controller/internal/db"
	"time"
)

type BotStatus string

const (
	BotStatusIdle       BotStatus = "IDLE"
	BotStatusProcessing BotStatus = "PROCESSING"
)

type Bot struct {
	ID                  int
	Status              BotStatus
	CurrentOrderID      int
	ProcessingStartedAt time.Time
	CreatedAt           time.Time
}

type BotService struct {
	db *db.Database
}

func NewBotService(database *db.Database) *BotService {
	return &BotService{db: database}
}

func (s *BotService) CreateBot() (*Bot, error) {
	result, err := s.db.Exec(
		"INSERT INTO bots (status) VALUES (?)",
		BotStatusIdle,
	)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return s.GetBot(int(id))
}

func (s *BotService) scanBot(row interface{ Scan(...any) error }) (*Bot, error) {
	bot := &Bot{}
	var processingStartedAt sql.NullTime
	err := row.Scan(&bot.ID, &bot.Status, &bot.CurrentOrderID, &processingStartedAt, &bot.CreatedAt)
	if err != nil {
		return nil, err
	}
	if processingStartedAt.Valid {
		bot.ProcessingStartedAt = processingStartedAt.Time
	}
	return bot, nil
}

func (s *BotService) GetBot(id int) (*Bot, error) {
	row := s.db.QueryRow(
		"SELECT id, status, COALESCE(current_order_id, 0), processing_started_at, created_at FROM bots WHERE id = ?",
		id,
	)
	return s.scanBot(row)
}

func (s *BotService) GetAllBots() ([]*Bot, error) {
	rows, err := s.db.Query(`
		SELECT id, status, COALESCE(current_order_id, 0), processing_started_at, created_at
		FROM bots
		ORDER BY id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bots []*Bot
	for rows.Next() {
		bot, err := s.scanBot(rows)
		if err != nil {
			return nil, err
		}
		bots = append(bots, bot)
	}
	return bots, nil
}

func (s *BotService) GetIdleBots() ([]*Bot, error) {
	rows, err := s.db.Query(`
		SELECT id, status, COALESCE(current_order_id, 0), processing_started_at, created_at
		FROM bots
		WHERE status = ?
		ORDER BY id ASC
	`, BotStatusIdle)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bots []*Bot
	for rows.Next() {
		bot, err := s.scanBot(rows)
		if err != nil {
			return nil, err
		}
		bots = append(bots, bot)
	}
	return bots, nil
}

func (s *BotService) AssignOrderToBot(botID int, orderID int) error {
	_, err := s.db.Exec(
		"UPDATE bots SET status = ?, current_order_id = ?, processing_started_at = ? WHERE id = ?",
		BotStatusProcessing, orderID, time.Now(), botID,
	)
	return err
}

func (s *BotService) CompleteOrder(botID int) error {
	_, err := s.db.Exec(
		"UPDATE bots SET status = ?, current_order_id = NULL, processing_started_at = NULL WHERE id = ?",
		BotStatusIdle, botID,
	)
	return err
}

func (s *BotService) RemoveNewestBot() (*Bot, error) {
	row := s.db.QueryRow(`
		SELECT id, status, COALESCE(current_order_id, 0), processing_started_at, created_at
		FROM bots
		ORDER BY id DESC
		LIMIT 1
	`)
	bot, err := s.scanBot(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	_, err = s.db.Exec("DELETE FROM bots WHERE id = ?", bot.ID)
	if err != nil {
		return nil, err
	}

	return bot, nil
}
