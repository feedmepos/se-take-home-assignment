package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
)

// RoleRepository implements PostgreSQL role repository
type RoleRepository struct {
	db *sql.DB
}

// NewRoleRepository creates a new PostgreSQL role repository
func NewRoleRepository(db *sql.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

// Create creates a new role
func (r *RoleRepository) Create(ctx context.Context, role *domain.Role) (*domain.Role, error) {
	query := `
		INSERT INTO role (name, created_at, modified_at)
		VALUES ($1, $2, $3)
		RETURNING id
	`

	now := time.Now()
	err := r.db.QueryRowContext(ctx, query, role.Name, now, now).Scan(&role.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}

	role.CreatedAt = now
	role.ModifiedAt = now
	return role, nil
}

// GetByName retrieves a role by name
func (r *RoleRepository) GetByName(ctx context.Context, name domain.RoleType) (*domain.Role, error) {
	query := `
		SELECT id, name, created_at, modified_at, deleted_at
		FROM role
		WHERE name = $1
	`

	role := &domain.Role{}
	err := r.db.QueryRowContext(ctx, query, name).Scan(
		&role.ID, &role.Name,
		&role.CreatedAt, &role.ModifiedAt, &role.DeletedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("role not found: %s", name)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get role: %w", err)
	}

	return role, nil
}

// GetAll retrieves all roles
func (r *RoleRepository) GetAll(ctx context.Context) ([]*domain.Role, error) {
	query := `
		SELECT id, name, created_at, modified_at, deleted_at
		FROM role
		WHERE deleted_at IS NULL
		ORDER BY id
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get all roles: %w", err)
	}
	defer rows.Close()

	var roles []*domain.Role
	for rows.Next() {
		role := &domain.Role{}
		if err := rows.Scan(
			&role.ID, &role.Name,
			&role.CreatedAt, &role.ModifiedAt, &role.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan role: %w", err)
		}
		roles = append(roles, role)
	}

	return roles, nil
}
