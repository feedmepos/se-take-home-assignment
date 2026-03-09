package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hwakman/se-take-home-assignment/internal/service"
	"github.com/hwakman/se-take-home-assignment/pkg/utils"
)

// BotHandler handles HTTP requests related to worker bot management
type BotHandler struct {
	service *service.OrderService
}

func NewBotHandler(s *service.OrderService) *BotHandler {
	return &BotHandler{service: s}
}

// ScaleBots handles POST /api/v1/bots - scales the workforce up or down (0-100)
func (h *BotHandler) ScaleBots(c *gin.Context) {
	var req struct {
		Count int `json:"count"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if req.Count < 0 || req.Count > 100 {
		utils.JSON(c, http.StatusBadRequest, "Count must be between 0 and 100", nil)
		return
	}

	h.service.SetBotCount(req.Count)
	utils.JSON(c, http.StatusOK, "Bots scaled successfully", gin.H{"target_count": req.Count})
}

// GetBots handles GET /api/v1/bots - lists current status of all bots
func (h *BotHandler) GetBots(c *gin.Context) {
	bots := h.service.GetBots()
	utils.JSON(c, http.StatusOK, "Bots retrieved successfully", bots)
}
