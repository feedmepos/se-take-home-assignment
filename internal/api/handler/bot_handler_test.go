package handler

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/hwakman/se-take-home-assignment/internal/service"
	"github.com/stretchr/testify/assert"
)

func TestBotHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	s := service.NewOrderService()
	h := NewBotHandler(s)
	r := gin.Default()
	r.POST("/bots", h.ScaleBots)
	r.GET("/bots", h.GetBots)

	// Scale up
	w1 := performRequest(r, "POST", "/bots", map[string]int{"count": 2})
	assert.Equal(t, http.StatusOK, w1.Code)
	assert.Equal(t, 2, len(s.GetBots()))

	// Get bots
	w2 := performRequest(r, "GET", "/bots", nil)
	assert.Equal(t, http.StatusOK, w2.Code)
	
	// Invalid count
	w3 := performRequest(r, "POST", "/bots", map[string]int{"count": 101})
	assert.Equal(t, http.StatusBadRequest, w3.Code)

	// Negative count
	w4 := performRequest(r, "POST", "/bots", map[string]int{"count": -1})
	assert.Equal(t, http.StatusBadRequest, w4.Code)

	// Invalid JSON
	w5 := performRequest(r, "POST", "/bots", "invalid")
	assert.Equal(t, http.StatusBadRequest, w5.Code)
}
