package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
)

// OrderRepository implements PostgreSQL order repository
// Following Repository Pattern: abstracts data access
// Optimized with indexes for O(log n) lookup performance
type OrderRepository struct {
	db *sql.DB
}

// NewOrderRepository creates a new PostgreSQL order repository
func NewOrderRepository(db *sql.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// Create creates a new order with associated foods
// Time Complexity: O(log n + m) where m is number of foods
func (r *OrderRepository) Create(ctx context.Context, order *domain.Order, foodIDs []int) (*domain.Order, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert order
	query := `
		INSERT INTO "order" (status, assigned_cook_user, ordered_by, created_at, modified_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

	now := time.Now()
	if order.Status == "" {
		order.Status = domain.OrderStatusPending
	}

	err = tx.QueryRowContext(
		ctx, query,
		order.Status, order.AssignedCookUser, order.OrderedBy, now, now,
	).Scan(&order.ID)

	if err != nil {
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	// Insert order-food relationships
	if len(foodIDs) > 0 {
		foodQuery := `
			INSERT INTO order_food (order_id, food_id, created_at, modified_at)
			VALUES ($1, $2, $3, $4)
		`

		for _, foodID := range foodIDs {
			_, err := tx.ExecContext(ctx, foodQuery, order.ID, foodID, now, now)
			if err != nil {
				return nil, fmt.Errorf("failed to create order-food relationship: %w", err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	order.CreatedAt = now
	order.ModifiedAt = now
	return order, nil
}

// GetByID retrieves an order by ID with enriched data
// Time Complexity: O(log n) with indexes
func (r *OrderRepository) GetByID(ctx context.Context, id int) (*domain.Order, error) {
	query := `
		SELECT
			o.id, o.status, o.assigned_cook_user, o.ordered_by,
			o.created_at, o.modified_at, o.deleted_at,
			u.name as customer_name, u.role as customer_role,
			COALESCE(c.name, '') as cook_name
		FROM "order" o
		INNER JOIN "user" u ON o.ordered_by = u.id
		LEFT JOIN "user" c ON o.assigned_cook_user = c.id
		WHERE o.id = $1
	`

	order := &domain.Order{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&order.ID, &order.Status, &order.AssignedCookUser, &order.OrderedBy,
		&order.CreatedAt, &order.ModifiedAt, &order.DeletedAt,
		&order.CustomerName, &order.CustomerRole, &order.CookName,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("order not found: %d", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get order: %w", err)
	}

	// Get associated foods
	foodQuery := `
		SELECT f.id, f.name, f.type, f.created_at, f.modified_at
		FROM food f
		INNER JOIN order_food of ON f.id = of.food_id
		WHERE of.order_id = $1 AND of.deleted_at IS NULL
	`

	rows, err := r.db.QueryContext(ctx, foodQuery, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get order foods: %w", err)
	}
	defer rows.Close()

	var foods []domain.Food
	for rows.Next() {
		food := domain.Food{}
		if err := rows.Scan(&food.ID, &food.Name, &food.Type, &food.CreatedAt, &food.ModifiedAt); err != nil {
			return nil, fmt.Errorf("failed to scan food: %w", err)
		}
		foods = append(foods, food)
	}
	order.Foods = foods

	return order, nil
}

// GetByStatus retrieves all orders with a specific status
// Time Complexity: O(n) with index on status
func (r *OrderRepository) GetByStatus(ctx context.Context, status domain.OrderStatus) ([]*domain.Order, error) {
	query := `
		SELECT
			o.id, o.status, o.assigned_cook_user, o.ordered_by,
			o.created_at, o.modified_at, o.deleted_at,
			u.name as customer_name, u.role as customer_role
		FROM "order" o
		INNER JOIN "user" u ON o.ordered_by = u.id
		WHERE o.status = $1 AND o.deleted_at IS NULL
		ORDER BY o.id
	`

	rows, err := r.db.QueryContext(ctx, query, status)
	if err != nil {
		return nil, fmt.Errorf("failed to get orders by status: %w", err)
	}
	defer rows.Close()

	return r.scanOrders(rows)
}

// GetByCustomerID retrieves all orders for a customer
// Time Complexity: O(n) with index on ordered_by
func (r *OrderRepository) GetByCustomerID(ctx context.Context, customerID int) ([]*domain.Order, error) {
	query := `
		SELECT
			o.id, o.status, o.assigned_cook_user, o.ordered_by,
			o.created_at, o.modified_at, o.deleted_at,
			u.name as customer_name, u.role as customer_role
		FROM "order" o
		INNER JOIN "user" u ON o.ordered_by = u.id
		WHERE o.ordered_by = $1 AND o.deleted_at IS NULL
		ORDER BY o.id
	`

	rows, err := r.db.QueryContext(ctx, query, customerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get orders by customer: %w", err)
	}
	defer rows.Close()

	return r.scanOrders(rows)
}

// GetByCookID retrieves all orders assigned to a cook
// Time Complexity: O(n) with index on assigned_cook_user
func (r *OrderRepository) GetByCookID(ctx context.Context, cookID int) ([]*domain.Order, error) {
	query := `
		SELECT
			o.id, o.status, o.assigned_cook_user, o.ordered_by,
			o.created_at, o.modified_at, o.deleted_at,
			u.name as customer_name, u.role as customer_role
		FROM "order" o
		INNER JOIN "user" u ON o.ordered_by = u.id
		WHERE o.assigned_cook_user = $1
		ORDER BY o.id
	`

	rows, err := r.db.QueryContext(ctx, query, cookID)
	if err != nil {
		return nil, fmt.Errorf("failed to get orders by cook: %w", err)
	}
	defer rows.Close()

	return r.scanOrders(rows)
}

// Update updates an existing order
// Time Complexity: O(log n) with index on id
func (r *OrderRepository) Update(ctx context.Context, order *domain.Order) error {
	query := `
		UPDATE "order"
		SET status = $1, assigned_cook_user = $2, modified_at = $3
		WHERE id = $4
	`

	order.ModifiedAt = time.Now()
	result, err := r.db.ExecContext(
		ctx, query,
		order.Status, order.AssignedCookUser, order.ModifiedAt, order.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update order: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("order not found: %d", order.ID)
	}

	return nil
}

// AssignCook assigns a cook to an order
// Time Complexity: O(log n) with index on id
func (r *OrderRepository) AssignCook(ctx context.Context, orderID, cookID int) error {
	query := `
		UPDATE "order"
		SET assigned_cook_user = $1, modified_at = $2
		WHERE id = $3
	`

	now := time.Now()
	result, err := r.db.ExecContext(ctx, query, cookID, now, orderID)
	if err != nil {
		return fmt.Errorf("failed to assign cook: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("order not found: %d", orderID)
	}

	return nil
}

// UnassignCook removes cook assignment from an order
// Time Complexity: O(log n) with index on id
func (r *OrderRepository) UnassignCook(ctx context.Context, orderID int) error {
	query := `
		UPDATE "order"
		SET assigned_cook_user = NULL, modified_at = $1
		WHERE id = $2
	`

	now := time.Now()
	result, err := r.db.ExecContext(ctx, query, now, orderID)
	if err != nil {
		return fmt.Errorf("failed to unassign cook: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("order not found: %d", orderID)
	}

	return nil
}

// UpdateStatus updates the status of an order
// Time Complexity: O(log n) with index on id
func (r *OrderRepository) UpdateStatus(ctx context.Context, orderID int, status domain.OrderStatus) error {
	query := `
		UPDATE "order"
		SET status = $1, modified_at = $2
		WHERE id = $3
	`

	now := time.Now()
	result, err := r.db.ExecContext(ctx, query, status, now, orderID)
	if err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("order not found: %d", orderID)
	}

	return nil
}

// GetPendingOrders retrieves all pending orders
// Time Complexity: O(n) with index on status
func (r *OrderRepository) GetPendingOrders(ctx context.Context) ([]*domain.Order, error) {
	return r.GetByStatus(ctx, domain.OrderStatusPending)
}

// GetStats retrieves order statistics
// Time Complexity: O(n) - scans all orders
func (r *OrderRepository) GetStats(ctx context.Context) (completed, incomplete int, err error) {
	query := `
		SELECT
			COUNT(CASE WHEN status = $1 THEN 1 END) as completed,
			COUNT(CASE WHEN status != $1 THEN 1 END) as incomplete
		FROM "order"
		WHERE deleted_at IS NULL
	`

	err = r.db.QueryRowContext(ctx, query, domain.OrderStatusComplete).Scan(&completed, &incomplete)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to get stats: %w", err)
	}

	return completed, incomplete, nil
}

// Helper function to scan orders from rows
func (r *OrderRepository) scanOrders(rows *sql.Rows) ([]*domain.Order, error) {
	var orders []*domain.Order
	for rows.Next() {
		order := &domain.Order{}
		if err := rows.Scan(
			&order.ID, &order.Status, &order.AssignedCookUser, &order.OrderedBy,
			&order.CreatedAt, &order.ModifiedAt, &order.DeletedAt,
			&order.CustomerName, &order.CustomerRole,
		); err != nil {
			return nil, fmt.Errorf("failed to scan order: %w", err)
		}
		orders = append(orders, order)
	}

	return orders, nil
}
