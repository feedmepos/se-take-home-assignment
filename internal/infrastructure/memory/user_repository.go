package memory

import (
	"context"
	"fmt"
	"sync"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
)

// UserRepository implements in-memory user repository
// Following Repository Pattern: abstracts data access
// Time Complexity: Most operations are O(1) due to map usage
type UserRepository struct {
	users  map[int]*domain.User // Map for O(1) lookup by ID
	mu     sync.RWMutex         // Protects concurrent access
	nextID int                  // Auto-increment ID
}

// NewUserRepository creates a new in-memory user repository
func NewUserRepository() *UserRepository {
	return &UserRepository{
		users:  make(map[int]*domain.User),
		nextID: 1,
	}
}

// Create creates a new user
// Time Complexity: O(1) - map insertion
func (r *UserRepository) Create(ctx context.Context, user *domain.User) (*domain.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	user.ID = r.nextID
	r.nextID++
	user.CreatedAt = time.Now()
	user.ModifiedAt = time.Now()

	r.users[user.ID] = user
	return user, nil
}

// GetByID retrieves a user by ID
// Time Complexity: O(1) - map lookup
func (r *UserRepository) GetByID(ctx context.Context, id int) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	user, exists := r.users[id]
	if !exists {
		return nil, fmt.Errorf("user not found: %d", id)
	}

	return user, nil
}

// GetByRole retrieves all users with a specific role
// Time Complexity: O(n) - must scan all users
func (r *UserRepository) GetByRole(ctx context.Context, role domain.RoleType) ([]*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*domain.User
	for _, user := range r.users {
		if user.Role == role && user.DeletedAt == nil {
			result = append(result, user)
		}
	}

	return result, nil
}

// GetAllCooks retrieves all cook users
// Time Complexity: O(n) - must scan all users
func (r *UserRepository) GetAllCooks(ctx context.Context, includeDeleted bool) ([]*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*domain.User
	for _, user := range r.users {
		if user.Role == domain.RoleCook {
			if includeDeleted || user.DeletedAt == nil {
				result = append(result, user)
			}
		}
	}

	return result, nil
}

// Update updates an existing user
// Time Complexity: O(1) - map lookup and update
func (r *UserRepository) Update(ctx context.Context, user *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.users[user.ID]; !exists {
		return fmt.Errorf("user not found: %d", user.ID)
	}

	user.ModifiedAt = time.Now()
	r.users[user.ID] = user
	return nil
}

// SoftDelete soft deletes a user
// Time Complexity: O(1) - map lookup and update
func (r *UserRepository) SoftDelete(ctx context.Context, id int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	user, exists := r.users[id]
	if !exists {
		return fmt.Errorf("user not found: %d", id)
	}

	now := time.Now()
	user.DeletedAt = &now
	user.ModifiedAt = now
	return nil
}

// Reinstate reinstates a soft-deleted user
// Time Complexity: O(1) - map lookup and update
func (r *UserRepository) Reinstate(ctx context.Context, id int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	user, exists := r.users[id]
	if !exists {
		return fmt.Errorf("user not found: %d", id)
	}

	user.DeletedAt = nil
	user.ModifiedAt = time.Now()
	return nil
}
