package v1

import (
	"net/http"
	"strconv"

	"mcmocknald-order-kiosk/internal/service"

	"github.com/gin-gonic/gin"
)

// CookController handles cook bot-related HTTP requests (API v1)
// Following MVC pattern: Controller layer for HTTP handling
// Following Single Responsibility Principle: only handles HTTP layer
type CookController struct {
	cookService service.CookService
}

// NewCookController creates a new cook controller
func NewCookController(cookService service.CookService) *CookController {
	return &CookController{
		cookService: cookService,
	}
}

// CreateCookRequest represents the request to create a new cook bot
type CreateCookRequest struct {
	Name string `json:"name" binding:"required"`
}

// CreateCook handles POST /api/v1/cooks
// @Summary Create a new cook bot (v1)
// @Description Create a new cook bot to process orders
// @Tags cooks
// @Accept json
// @Produce json
// @Param request body CreateCookRequest true "Cook creation request"
// @Success 201 {object} domain.User
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/cooks [post]
func (ctrl *CookController) CreateCook(c *gin.Context) {
	var req CreateCookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	cook, err := ctrl.cookService.CreateCook(c.Request.Context(), req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cook)
}

// RemoveCook handles DELETE /api/v1/cooks/:id
// @Summary Remove a cook bot (v1)
// @Description Soft delete a cook bot and return their order to queue
// @Tags cooks
// @Produce json
// @Param id path int true "Cook ID"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/cooks/{id} [delete]
func (ctrl *CookController) RemoveCook(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid cook id"})
		return
	}

	if err := ctrl.cookService.RemoveCook(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{Message: "Cook removed successfully"})
}

// ReinstateCook handles POST /api/v1/cooks/:id/reinstate
// @Summary Reinstate a cook bot (v1)
// @Description Reinstate a soft-deleted cook bot
// @Tags cooks
// @Produce json
// @Param id path int true "Cook ID"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/cooks/{id}/reinstate [post]
func (ctrl *CookController) ReinstateCook(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid cook id"})
		return
	}

	if err := ctrl.cookService.ReinstateCook(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{Message: "Cook reinstated successfully"})
}

// AcceptOrder handles POST /api/v1/cooks/:id/accept
// @Summary Accept an order (v1)
// @Description Cook accepts the next order from the queue
// @Tags cooks
// @Produce json
// @Param id path int true "Cook ID"
// @Success 200 {object} domain.Order
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/cooks/{id}/accept [post]
func (ctrl *CookController) AcceptOrder(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid cook id"})
		return
	}

	order, err := ctrl.cookService.AcceptOrder(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, order)
}

// GetAllCooks handles GET /api/v1/cooks
// @Summary Get all cook bots (v1)
// @Description Get all cook bots (optionally including deleted ones)
// @Tags cooks
// @Produce json
// @Param include_deleted query bool false "Include deleted cooks"
// @Success 200 {array} domain.User
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/cooks [get]
func (ctrl *CookController) GetAllCooks(c *gin.Context) {
	includeDeleted := c.Query("include_deleted") == "true"

	cooks, err := ctrl.cookService.GetAllCooks(c.Request.Context(), includeDeleted)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, cooks)
}

// SuccessResponse represents a success response
type SuccessResponse struct {
	Message string `json:"message"`
}
