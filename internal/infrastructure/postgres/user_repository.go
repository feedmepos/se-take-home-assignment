package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
)

// UserRepository implements PostgreSQL user repository
// Following Repository Pattern: abstracts data access
// Optimized with indexes for O(log n) lookup performance
type UserRepository struct {
	db *sql.DB
}

// NewUserRepository creates a new PostgreSQL user repository
func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
// Time Complexity: O(log n) with index on id
func (r *UserRepository) Create(ctx context.Context, user *domain.User) (*domain.User, error) {
	query := `
		INSERT INTO "user" (name, role, created_at, modified_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`

	now := time.Now()
	err := r.db.QueryRowContext(
		ctx, query,
		user.Name, user.Role, now, now,
	).Scan(&user.ID)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	user.CreatedAt = now
	user.ModifiedAt = now
	return user, nil
}

// GetByID retrieves a user by ID
// Time Complexity: O(log n) with index on id
func (r *UserRepository) GetByID(ctx context.Context, id int) (*domain.User, error) {
	query := `
		SELECT id, name, role, created_at, modified_at, deleted_at
		FROM "user"
		WHERE id = $1
	`

	user := &domain.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.Name, &user.Role,
		&user.CreatedAt, &user.ModifiedAt, &user.DeletedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found: %d", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// GetByRole retrieves all users with a specific role
// Time Complexity: O(n) with index on role for filtering
func (r *UserRepository) GetByRole(ctx context.Context, role domain.RoleType) ([]*domain.User, error) {
	query := `
		SELECT id, name, role, created_at, modified_at, deleted_at
		FROM "user"
		WHERE role = $1 AND deleted_at IS NULL
		ORDER BY id
	`

	rows, err := r.db.QueryContext(ctx, query, role)
	if err != nil {
		return nil, fmt.Errorf("failed to get users by role: %w", err)
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		user := &domain.User{}
		if err := rows.Scan(
			&user.ID, &user.Name, &user.Role,
			&user.CreatedAt, &user.ModifiedAt, &user.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}

	return users, nil
}

// GetAllCooks retrieves all cook users
// Time Complexity: O(n) with index on role for filtering
func (r *UserRepository) GetAllCooks(ctx context.Context, includeDeleted bool) ([]*domain.User, error) {
	query := `
		SELECT id, name, role, created_at, modified_at, deleted_at
		FROM "user"
		WHERE role = $1
	`

	if !includeDeleted {
		query += " AND deleted_at IS NULL"
	}
	query += " ORDER BY id"

	rows, err := r.db.QueryContext(ctx, query, domain.RoleCook)
	if err != nil {
		return nil, fmt.Errorf("failed to get cooks: %w", err)
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		user := &domain.User{}
		if err := rows.Scan(
			&user.ID, &user.Name, &user.Role,
			&user.CreatedAt, &user.ModifiedAt, &user.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}

	return users, nil
}

// Update updates an existing user
// Time Complexity: O(log n) with index on id
func (r *UserRepository) Update(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE "user"
		SET name = $1, role = $2, modified_at = $3, deleted_at = $4
		WHERE id = $5
	`

	user.ModifiedAt = time.Now()
	result, err := r.db.ExecContext(
		ctx, query,
		user.Name, user.Role, user.ModifiedAt, user.DeletedAt, user.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found: %d", user.ID)
	}

	return nil
}

// SoftDelete soft deletes a user
// Time Complexity: O(log n) with index on id
func (r *UserRepository) SoftDelete(ctx context.Context, id int) error {
	query := `
		UPDATE "user"
		SET deleted_at = $1, modified_at = $2
		WHERE id = $3 AND deleted_at IS NULL
	`

	now := time.Now()
	result, err := r.db.ExecContext(ctx, query, now, now, id)
	if err != nil {
		return fmt.Errorf("failed to soft delete user: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found or already deleted: %d", id)
	}

	return nil
}

// Reinstate reinstates a soft-deleted user
// Time Complexity: O(log n) with index on id
func (r *UserRepository) Reinstate(ctx context.Context, id int) error {
	query := `
		UPDATE "user"
		SET deleted_at = NULL, modified_at = $1
		WHERE id = $2 AND deleted_at IS NOT NULL
	`

	now := time.Now()
	result, err := r.db.ExecContext(ctx, query, now, id)
	if err != nil {
		return fmt.Errorf("failed to reinstate user: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found or not deleted: %d", id)
	}

	return nil
}
