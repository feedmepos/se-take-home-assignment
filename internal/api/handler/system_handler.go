package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hwakman/se-take-home-assignment/internal/service"
	"github.com/hwakman/se-take-home-assignment/pkg/utils"
)

type SystemHandler struct {
	service *service.OrderService
}

func NewSystemHandler(s *service.OrderService) *SystemHandler {
	return &SystemHandler{service: s}
}

func (h *SystemHandler) GetStatus(c *gin.Context) {
	status := h.service.GetSystemStatus()
	utils.JSON(c, http.StatusOK, "System status retrieved successfully", status)
}
