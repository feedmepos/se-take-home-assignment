package domain

import "context"

// UserRepository defines the interface for user data access
// Following Dependency Inversion Principle: depend on abstraction, not implementation
// Following Interface Segregation Principle: focused interface for user operations
type UserRepository interface {
	// Create creates a new user in the repository
	// Time Complexity: O(1) for in-memory, O(log n) for database with index
	Create(ctx context.Context, user *User) (*User, error)

	// GetByID retrieves a user by their ID
	// Time Complexity: O(1) for in-memory with map, O(log n) for database with index
	GetByID(ctx context.Context, id int) (*User, error)

	// GetByRole retrieves all users with a specific role
	// Time Complexity: O(n) - must scan all users
	GetByRole(ctx context.Context, role RoleType) ([]*User, error)

	// GetAllCooks retrieves all cook users (including soft deleted for reinstatement)
	// Time Complexity: O(n) - must scan all users
	GetAllCooks(ctx context.Context, includeDeleted bool) ([]*User, error)

	// Update updates an existing user
	// Time Complexity: O(1) for in-memory, O(log n) for database with index
	Update(ctx context.Context, user *User) error

	// SoftDelete soft deletes a user (sets DeletedAt timestamp)
	// Time Complexity: O(1) for in-memory, O(log n) for database with index
	SoftDelete(ctx context.Context, id int) error

	// Reinstate reinstates a soft-deleted user (clears DeletedAt timestamp)
	// Time Complexity: O(1) for in-memory, O(log n) for database with index
	Reinstate(ctx context.Context, id int) error
}

// OrderRepository defines the interface for order data access
// Following Dependency Inversion Principle: depend on abstraction, not implementation
// Following Interface Segregation Principle: focused interface for order operations
type OrderRepository interface {
	// Create creates a new order in the repository
	// Time Complexity: O(1) for in-memory, O(log n) for database with index
	Create(ctx context.Context, order *Order, foodIDs []int) (*Order, error)

	// GetByID retrieves an order by its ID
	// Time Complexity: O(1) for in-memory with map, O(log n) for database with index
	GetByID(ctx context.Context, id int) (*Order, error)

	// GetByStatus retrieves all orders with a specific status
	// Time Complexity: O(n) - must scan all orders
	GetByStatus(ctx context.Context, status OrderStatus) ([]*Order, error)

	// GetByCustomerID retrieves all orders for a specific customer
	// Time Complexity: O(n) - must scan all orders
	GetByCustomerID(ctx context.Context, customerID int) ([]*Order, error)

	// GetByCookID retrieves all orders assigned to a specific cook
	// Time Complexity: O(n) - must scan all orders
	GetByCookID(ctx context.Context, cookID int) ([]*Order, error)

	// Update updates an existing order
	// Time Complexity: O(1) for in-memory, O(log n) for database with index
	Update(ctx context.Context, order *Order) error

	// AssignCook assigns a cook to an order
	// Time Complexity: O(1) for in-memory, O(log n) for database with index
	AssignCook(ctx context.Context, orderID, cookID int) error

	// UnassignCook removes cook assignment from an order
	// Time Complexity: O(1) for in-memory, O(log n) for database with index
	UnassignCook(ctx context.Context, orderID int) error

	// UpdateStatus updates the status of an order
	// Time Complexity: O(1) for in-memory, O(log n) for database with index
	UpdateStatus(ctx context.Context, orderID int, status OrderStatus) error

	// GetPendingOrders retrieves all pending orders (for queue initialization)
	// Time Complexity: O(n) - must scan all orders
	GetPendingOrders(ctx context.Context) ([]*Order, error)

	// GetStats retrieves order statistics (completed/incomplete counts)
	// Time Complexity: O(n) - must scan all orders
	GetStats(ctx context.Context) (completed, incomplete int, err error)
}

// FoodRepository defines the interface for food data access
// Following Dependency Inversion Principle: depend on abstraction, not implementation
// Following Interface Segregation Principle: focused interface for food operations
type FoodRepository interface {
	// Create creates a new food item in the repository
	// Time Complexity: O(1) for in-memory, O(log n) for database with index
	Create(ctx context.Context, food *Food) (*Food, error)

	// GetByID retrieves a food item by its ID
	// Time Complexity: O(1) for in-memory with map, O(log n) for database with index
	GetByID(ctx context.Context, id int) (*Food, error)

	// GetAll retrieves all non-deleted food items
	// Time Complexity: O(n) - must return all foods
	GetAll(ctx context.Context) ([]*Food, error)

	// GetByType retrieves all non-deleted food items filtered by type
	// Time Complexity: O(n) - must scan all foods to filter by type
	GetByType(ctx context.Context, foodType FoodType) ([]*Food, error)

	// GetByOrderID retrieves all food items for a specific order
	// Time Complexity: O(n) - must scan all order-food relationships
	GetByOrderID(ctx context.Context, orderID int) ([]*Food, error)
}

// RoleRepository defines the interface for role data access
// Following Dependency Inversion Principle: depend on abstraction, not implementation
// Following Interface Segregation Principle: focused interface for role operations
type RoleRepository interface {
	// Create creates a new role in the repository
	// Time Complexity: O(1) for in-memory, O(log n) for database with index
	Create(ctx context.Context, role *Role) (*Role, error)

	// GetByName retrieves a role by its name
	// Time Complexity: O(1) for in-memory with map, O(log n) for database with index
	GetByName(ctx context.Context, name RoleType) (*Role, error)

	// GetAll retrieves all roles
	// Time Complexity: O(n) - must return all roles (typically 3 roles, so O(1) in practice)
	GetAll(ctx context.Context) ([]*Role, error)
}
