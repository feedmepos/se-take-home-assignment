package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
)

// FoodRepository implements PostgreSQL food repository
type FoodRepository struct {
	db *sql.DB
}

// NewFoodRepository creates a new PostgreSQL food repository
func NewFoodRepository(db *sql.DB) *FoodRepository {
	return &FoodRepository{db: db}
}

// Create creates a new food item
func (r *FoodRepository) Create(ctx context.Context, food *domain.Food) (*domain.Food, error) {
	query := `
		INSERT INTO food (name, type, created_at, modified_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`

	now := time.Now()
	err := r.db.QueryRowContext(ctx, query, food.Name, food.Type, now, now).Scan(&food.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to create food: %w", err)
	}

	food.CreatedAt = now
	food.ModifiedAt = now
	return food, nil
}

// GetByID retrieves a food item by ID
func (r *FoodRepository) GetByID(ctx context.Context, id int) (*domain.Food, error) {
	query := `
		SELECT id, name, type, created_at, modified_at, deleted_at
		FROM food
		WHERE id = $1
	`

	food := &domain.Food{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&food.ID, &food.Name, &food.Type,
		&food.CreatedAt, &food.ModifiedAt, &food.DeletedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("food not found: %d", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get food: %w", err)
	}

	return food, nil
}

// GetAll retrieves all non-deleted food items
// Time Complexity: O(n) where n is the number of food items
func (r *FoodRepository) GetAll(ctx context.Context) ([]*domain.Food, error) {
	query := `
		SELECT id, name, type, created_at, modified_at, deleted_at
		FROM food
		WHERE deleted_at IS NULL
		ORDER BY id
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get all foods: %w", err)
	}
	defer rows.Close()

	var foods []*domain.Food
	for rows.Next() {
		food := &domain.Food{}
		if err := rows.Scan(
			&food.ID, &food.Name, &food.Type,
			&food.CreatedAt, &food.ModifiedAt, &food.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan food: %w", err)
		}
		foods = append(foods, food)
	}

	return foods, nil
}

// GetByType retrieves all non-deleted food items filtered by type
// Time Complexity: O(n) where n is the number of food items (database filters via WHERE clause)
func (r *FoodRepository) GetByType(ctx context.Context, foodType domain.FoodType) ([]*domain.Food, error) {
	query := `
		SELECT id, name, type, created_at, modified_at, deleted_at
		FROM food
		WHERE type = $1 AND deleted_at IS NULL
		ORDER BY id
	`

	rows, err := r.db.QueryContext(ctx, query, foodType)
	if err != nil {
		return nil, fmt.Errorf("failed to get foods by type: %w", err)
	}
	defer rows.Close()

	var foods []*domain.Food
	for rows.Next() {
		food := &domain.Food{}
		if err := rows.Scan(
			&food.ID, &food.Name, &food.Type,
			&food.CreatedAt, &food.ModifiedAt, &food.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan food: %w", err)
		}
		foods = append(foods, food)
	}

	return foods, nil
}

// GetByOrderID retrieves all food items for an order
func (r *FoodRepository) GetByOrderID(ctx context.Context, orderID int) ([]*domain.Food, error) {
	query := `
		SELECT f.id, f.name, f.type, f.created_at, f.modified_at, f.deleted_at
		FROM food f
		INNER JOIN order_food of ON f.id = of.food_id
		WHERE of.order_id = $1 AND of.deleted_at IS NULL
		ORDER BY f.id
	`

	rows, err := r.db.QueryContext(ctx, query, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get foods by order: %w", err)
	}
	defer rows.Close()

	var foods []*domain.Food
	for rows.Next() {
		food := &domain.Food{}
		if err := rows.Scan(
			&food.ID, &food.Name, &food.Type,
			&food.CreatedAt, &food.ModifiedAt, &food.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan food: %w", err)
		}
		foods = append(foods, food)
	}

	return foods, nil
}
