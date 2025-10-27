package domain

import "time"

// RoleType represents the type of role a user has in the system
type RoleType string

const (
	RoleRegularCustomer RoleType = "Regular Customer"
	RoleVIPCustomer     RoleType = "VIP Customer"
	RoleCook            RoleType = "Cook"
)

// User represents a user entity in the system (can be customer or cook)
// Following Single Responsibility Principle: only represents user data
type User struct {
	ID         int       `json:"id" db:"id"`
	Name       string    `json:"name" db:"name" binding:"required"`
	Role       RoleType  `json:"role" db:"role" binding:"required"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	ModifiedAt time.Time `json:"modified_at" db:"modified_at"`
	DeletedAt  *time.Time `json:"deleted_at,omitempty" db:"deleted_at"` // Soft delete support
}

// IsCustomer checks if the user is a customer (Regular or VIP)
// Time Complexity: O(1)
func (u *User) IsCustomer() bool {
	return u.Role == RoleRegularCustomer || u.Role == RoleVIPCustomer
}

// IsVIP checks if the user is a VIP customer
// Time Complexity: O(1)
func (u *User) IsVIP() bool {
	return u.Role == RoleVIPCustomer
}

// IsCook checks if the user is a cook
// Time Complexity: O(1)
func (u *User) IsCook() bool {
	return u.Role == RoleCook
}

// IsDeleted checks if the user has been soft deleted
// Time Complexity: O(1)
func (u *User) IsDeleted() bool {
	return u.DeletedAt != nil
}

// Role entity represents a role in the system
type Role struct {
	ID         int       `json:"id" db:"id"`
	Name       RoleType  `json:"name" db:"name"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	ModifiedAt time.Time `json:"modified_at" db:"modified_at"`
	DeletedAt  *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}
