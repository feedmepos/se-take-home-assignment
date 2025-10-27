package v1

import (
	"net/http"
	"strconv"

	"mcmocknald-order-kiosk/internal/domain"
	"mcmocknald-order-kiosk/internal/service"

	"github.com/gin-gonic/gin"
)

// FoodController handles food-related HTTP requests (API v1)
// Following MVC pattern: Controller layer for HTTP handling
// Following Single Responsibility Principle: only handles HTTP layer for food operations
// Following Dependency Inversion Principle: depends on FoodService interface, not concrete implementation
type FoodController struct {
	foodService service.FoodService
}

// NewFoodController creates a new food controller with dependency injection
func NewFoodController(foodService service.FoodService) *FoodController {
	return &FoodController{
		foodService: foodService,
	}
}

// GetAllFoods handles GET /api/v1/foods
// Supports optional query parameter 'type' to filter by food type
// @Summary Get all food items (v1)
// @Description Get all non-deleted food items, optionally filtered by type (Food, Drink, or Dessert)
// @Tags foods
// @Produce json
// @Param type query string false "Filter by food type (Food, Drink, Dessert)"
// @Success 200 {object} FoodListResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/foods [get]
func (ctrl *FoodController) GetAllFoods(c *gin.Context) {
	// Check if type filter is provided
	foodTypeParam := c.Query("type")

	// If type parameter is provided, filter by type
	if foodTypeParam != "" {
		foodType := domain.FoodType(foodTypeParam)

		// Validate food type
		if !isValidFoodTypeParam(foodType) {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error: "invalid food type. Must be one of: Food, Drink, Dessert",
			})
			return
		}

		// Get foods filtered by type
		foods, err := ctrl.foodService.GetFoodsByType(c.Request.Context(), foodType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
			return
		}

		c.JSON(http.StatusOK, FoodListResponse{
			Foods: foods,
			Count: len(foods),
			Type:  string(foodType),
		})
		return
	}

	// No filter - get all foods
	foods, err := ctrl.foodService.GetAllFoods(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, FoodListResponse{
		Foods: foods,
		Count: len(foods),
	})
}

// GetFoodByID handles GET /api/v1/foods/:id
// @Summary Get a food item by ID (v1)
// @Description Get a specific food item by its ID
// @Tags foods
// @Produce json
// @Param id path int true "Food ID"
// @Success 200 {object} domain.Food
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/foods/{id} [get]
func (ctrl *FoodController) GetFoodByID(c *gin.Context) {
	// Parse and validate ID parameter
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: "invalid food id: must be a positive integer",
		})
		return
	}

	if id <= 0 {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: "invalid food id: must be a positive integer",
		})
		return
	}

	// Retrieve food item
	food, err := ctrl.foodService.GetFoodByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, food)
}

// FoodListResponse represents a list of food items with metadata
type FoodListResponse struct {
	Foods []*domain.Food `json:"foods"`
	Count int            `json:"count"`
	Type  string         `json:"type,omitempty"` // Only present when filtered by type
}

// isValidFoodTypeParam validates the food type query parameter
// Time Complexity: O(1) - constant time comparison
func isValidFoodTypeParam(foodType domain.FoodType) bool {
	switch foodType {
	case domain.FoodTypeFood, domain.FoodTypeDrink, domain.FoodTypeDessert:
		return true
	default:
		return false
	}
}
