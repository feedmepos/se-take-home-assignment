package domain

import "time"

// FoodType represents the type of food item
type FoodType string

const (
	FoodTypeFood    FoodType = "Food"
	FoodTypeDrink   FoodType = "Drink"
	FoodTypeDessert FoodType = "Dessert"
)

// Food represents a food item entity in the system
// Following Single Responsibility Principle: only represents food data
type Food struct {
	ID         int       `json:"id" db:"id"`
	Name       string    `json:"name" db:"name" binding:"required"`
	Type       FoodType  `json:"type" db:"type" binding:"required"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	ModifiedAt time.Time `json:"modified_at" db:"modified_at"`
	DeletedAt  *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// IsDeleted checks if the food item has been soft deleted
// Time Complexity: O(1)
func (f *Food) IsDeleted() bool {
	return f.DeletedAt != nil
}
