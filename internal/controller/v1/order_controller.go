package v1

import (
	"net/http"
	"strconv"

	"mcmocknald-order-kiosk/internal/service"

	"github.com/gin-gonic/gin"
)

// OrderController handles order-related HTTP requests (API v1)
// Following MVC pattern: Controller layer for HTTP handling
// Following Single Responsibility Principle: only handles HTTP layer
type OrderController struct {
	orderService service.OrderService
}

// NewOrderController creates a new order controller
func NewOrderController(orderService service.OrderService) *OrderController {
	return &OrderController{
		orderService: orderService,
	}
}

// CreateOrderRequest represents the request to create a new order
type CreateOrderRequest struct {
	CustomerID int   `json:"customer_id" binding:"required"`
	FoodIDs    []int `json:"food_ids" binding:"required,min=1"`
}

// CreateOrder handles POST /api/v1/orders
// @Summary Create a new order (v1)
// @Description Create a new order for a customer (Regular or VIP)
// @Tags orders
// @Accept json
// @Produce json
// @Param request body CreateOrderRequest true "Order creation request"
// @Success 201 {object} domain.Order
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/orders [post]
func (ctrl *OrderController) CreateOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	order, err := ctrl.orderService.CreateOrder(c.Request.Context(), req.CustomerID, req.FoodIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, order)
}

// GetOrder handles GET /api/v1/orders/:id
// @Summary Get an order by ID (v1)
// @Description Get an order by its ID
// @Tags orders
// @Produce json
// @Param id path int true "Order ID"
// @Success 200 {object} domain.Order
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/orders/{id} [get]
func (ctrl *OrderController) GetOrder(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid order id"})
		return
	}

	order, err := ctrl.orderService.GetOrder(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, order)
}

// GetOrderStats handles GET /api/v1/orders/stats
// @Summary Get order statistics (v1)
// @Description Get completed and incomplete order counts
// @Tags orders
// @Produce json
// @Success 200 {object} OrderStatsResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/orders/stats [get]
func (ctrl *OrderController) GetOrderStats(c *gin.Context) {
	completed, incomplete, err := ctrl.orderService.GetOrderStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, OrderStatsResponse{
		Completed:  completed,
		Incomplete: incomplete,
		QueueSize:  ctrl.orderService.GetQueueSize(),
	})
}

// OrderStatsResponse represents order statistics
type OrderStatsResponse struct {
	Completed  int `json:"completed"`
	Incomplete int `json:"incomplete"`
	QueueSize  int `json:"queue_size"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error"`
}
