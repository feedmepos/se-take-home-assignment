package memory

import (
	"context"
	"fmt"
	"sync"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
)

// RoleRepository implements in-memory role repository
// Following Repository Pattern: abstracts data access
// Time Complexity: Most operations are O(1) due to map usage
type RoleRepository struct {
	roles       map[int]*domain.Role             // Map for O(1) lookup by ID
	rolesByName map[domain.RoleType]*domain.Role // Map for O(1) lookup by name
	mu          sync.RWMutex                     // Protects concurrent access
	nextID      int                              // Auto-increment ID
}

// NewRoleRepository creates a new in-memory role repository
func NewRoleRepository() *RoleRepository {
	return &RoleRepository{
		roles:       make(map[int]*domain.Role),
		rolesByName: make(map[domain.RoleType]*domain.Role),
		nextID:      1,
	}
}

// Create creates a new role
// Time Complexity: O(1) - map insertion
func (r *RoleRepository) Create(ctx context.Context, role *domain.Role) (*domain.Role, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Check if role already exists
	if _, exists := r.rolesByName[role.Name]; exists {
		return nil, fmt.Errorf("role already exists: %s", role.Name)
	}

	role.ID = r.nextID
	r.nextID++
	role.CreatedAt = time.Now()
	role.ModifiedAt = time.Now()

	r.roles[role.ID] = role
	r.rolesByName[role.Name] = role
	return role, nil
}

// GetByName retrieves a role by name
// Time Complexity: O(1) - map lookup
func (r *RoleRepository) GetByName(ctx context.Context, name domain.RoleType) (*domain.Role, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	role, exists := r.rolesByName[name]
	if !exists {
		return nil, fmt.Errorf("role not found: %s", name)
	}

	return role, nil
}

// GetAll retrieves all roles
// Time Complexity: O(n) - must return all roles (typically 3, so O(1) in practice)
func (r *RoleRepository) GetAll(ctx context.Context) ([]*domain.Role, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*domain.Role, 0, len(r.roles))
	for _, role := range r.roles {
		if role.DeletedAt == nil {
			result = append(result, role)
		}
	}

	return result, nil
}
