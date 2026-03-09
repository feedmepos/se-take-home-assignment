package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/hwakman/se-take-home-assignment/internal/service"
	"github.com/stretchr/testify/assert"
)

func performRequest(r http.Handler, method, path string, body interface{}) *httptest.ResponseRecorder {
	var buf bytes.Buffer
	if body != nil {
		json.NewEncoder(&buf).Encode(body)
	}
	req, _ := http.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestOrderHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	s := service.NewOrderService()
	h := NewOrderHandler(s)
	r := gin.Default()
	r.POST("/orders", h.CreateOrder)
	r.GET("/orders", h.GetAllOrders)
	r.GET("/orders/:id", h.GetOrder)
	r.GET("/queue", h.GetQueue)

	// Create order
	w1 := performRequest(r, "POST", "/orders", map[string]string{
		"customer_name": "Test",
		"order_type":    "vip",
	})
	assert.Equal(t, http.StatusCreated, w1.Code)

	// Get all
	w2 := performRequest(r, "GET", "/orders", nil)
	assert.Equal(t, http.StatusOK, w2.Code)

	// Get by ID
	w3 := performRequest(r, "GET", "/orders/1", nil)
	assert.Equal(t, http.StatusOK, w3.Code)

	// Get non-existent
	w5 := performRequest(r, "GET", "/orders/999", nil)
	assert.Equal(t, http.StatusNotFound, w5.Code)

	// Get invalid ID
	w6 := performRequest(r, "GET", "/orders/abc", nil)
	assert.Equal(t, http.StatusBadRequest, w6.Code)
}

func TestOrderHandler_Defaults(t *testing.T) {
	gin.SetMode(gin.TestMode)
	s := service.NewOrderService()
	h := NewOrderHandler(s)
	r := gin.Default()
	r.POST("/orders", h.CreateOrder)

	w := performRequest(r, "POST", "/orders", map[string]string{})
	assert.Equal(t, http.StatusCreated, w.Code)
	
	var res map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &res)
	data := res["data"].(map[string]interface{})
	assert.Equal(t, "anonymous", data["customer_name"])
	assert.Equal(t, "normal", data["order_type"])
}
