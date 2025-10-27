package domain

import "time"

// OrderStatus represents the current status of an order
type OrderStatus string

const (
	OrderStatusPending  OrderStatus = "PENDING"
	OrderStatusServing  OrderStatus = "SERVING"
	OrderStatusComplete OrderStatus = "COMPLETE"
)

// Order represents an order entity in the system
// Following Single Responsibility Principle: only represents order data
type Order struct {
	ID                int         `json:"id" db:"id"`
	Status            OrderStatus `json:"status" db:"status"`
	AssignedCookUser  *int        `json:"assigned_cook_user,omitempty" db:"assigned_cook_user"` // Foreign key to User (Cook)
	OrderedBy         int         `json:"ordered_by" db:"ordered_by"` // Foreign key to User (Customer)
	CreatedAt         time.Time   `json:"created_at" db:"created_at"`
	ModifiedAt        time.Time   `json:"modified_at" db:"modified_at"`
	DeletedAt         *time.Time  `json:"deleted_at,omitempty" db:"deleted_at"`

	// Additional fields for enriched responses (not in DB)
	CustomerName      string      `json:"customer_name,omitempty" db:"-"`
	CustomerRole      RoleType    `json:"customer_role,omitempty" db:"-"`
	CookName          string      `json:"cook_name,omitempty" db:"-"`
	Foods             []Food      `json:"foods,omitempty" db:"-"`
}

// IsPending checks if the order is in pending status
// Time Complexity: O(1)
func (o *Order) IsPending() bool {
	return o.Status == OrderStatusPending
}

// IsServing checks if the order is being served
// Time Complexity: O(1)
func (o *Order) IsServing() bool {
	return o.Status == OrderStatusServing
}

// IsComplete checks if the order is completed
// Time Complexity: O(1)
func (o *Order) IsComplete() bool {
	return o.Status == OrderStatusComplete
}

// IsDeleted checks if the order has been soft deleted
// Time Complexity: O(1)
func (o *Order) IsDeleted() bool {
	return o.DeletedAt != nil
}

// HasAssignedCook checks if the order has an assigned cook
// Time Complexity: O(1)
func (o *Order) HasAssignedCook() bool {
	return o.AssignedCookUser != nil
}

// OrderFood represents the many-to-many relationship between orders and foods
type OrderFood struct {
	ID         int        `json:"id" db:"id"`
	OrderID    int        `json:"order_id" db:"order_id"`
	FoodID     int        `json:"food_id" db:"food_id"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	ModifiedAt time.Time  `json:"modified_at" db:"modified_at"`
	DeletedAt  *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}
