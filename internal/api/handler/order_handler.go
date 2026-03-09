package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hwakman/se-take-home-assignment/internal/domain"
	"github.com/hwakman/se-take-home-assignment/internal/service"
	"github.com/hwakman/se-take-home-assignment/pkg/utils"
)

// OrderHandler handles HTTP requests related to customer orders
type OrderHandler struct {
	service *service.OrderService
}

func NewOrderHandler(s *service.OrderService) *OrderHandler {
	return &OrderHandler{service: s}
}

// CreateOrder handles POST /api/v1/orders - allows customers to place new orders
func (h *OrderHandler) CreateOrder(c *gin.Context) {
	var req struct {
		CustomerName string           `json:"customer_name"`
		OrderType    domain.OrderType `json:"order_type"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if req.CustomerName == "" {
		req.CustomerName = "anonymous"
	}

	if req.OrderType == "" {
		req.OrderType = domain.OrderTypeNormal
	}

	order := h.service.CreateOrder(req.CustomerName, req.OrderType)
	utils.JSON(c, http.StatusCreated, "Order placed successfully", order)
}

// GetAllOrders handles GET /api/v1/orders - returns a list of all orders in the system
func (h *OrderHandler) GetAllOrders(c *gin.Context) {
	orders := h.service.GetAllOrders()
	utils.JSON(c, http.StatusOK, "Orders retrieved successfully", orders)
}

func (h *OrderHandler) GetOrder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.JSON(c, http.StatusBadRequest, "Invalid order ID", nil)
		return
	}

	order, ok := h.service.GetOrder(id)
	if !ok {
		utils.JSON(c, http.StatusNotFound, "Order not found", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "Order retrieved successfully", order)
}

// GetQueue handles GET /api/v1/orders/queue - shows current pending orders in priority order
func (h *OrderHandler) GetQueue(c *gin.Context) {
	queue := h.service.GetQueue()
	utils.JSON(c, http.StatusOK, "Queue retrieved successfully", queue)
}
