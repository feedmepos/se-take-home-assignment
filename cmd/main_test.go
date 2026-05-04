package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"order-controller/internal/db"
)

func newTestServer(t *testing.T) *Server {
	database, err := db.New(":memory:")
	require.NoError(t, err)

	t.Cleanup(func() {
		database.Close()
	})

	return NewServer(database)
}

func TestHealthEndpoint(t *testing.T) {
	s := newTestServer(t)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestCreateNormalOrder(t *testing.T) {
	s := newTestServer(t)

	req := httptest.NewRequest(http.MethodPost, "/orders/normal", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Verify order was created
	req = httptest.NewRequest(http.MethodGet, "/orders", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var response OrdersResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Len(t, response.Orders, 1)
	assert.Equal(t, "NORMAL", response.Orders[0].Type)
	assert.Equal(t, "PENDING", response.Orders[0].Status)
}

func TestCreateVIPOrder(t *testing.T) {
	s := newTestServer(t)

	req := httptest.NewRequest(http.MethodPost, "/orders/vip", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Verify order was created
	req = httptest.NewRequest(http.MethodGet, "/orders", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var response OrdersResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Len(t, response.Orders, 1)
	assert.Equal(t, "VIP", response.Orders[0].Type)
	assert.Equal(t, "PENDING", response.Orders[0].Status)
}

func TestGetOrdersByStatus(t *testing.T) {
	s := newTestServer(t)

	// Create orders
	req := httptest.NewRequest(http.MethodPost, "/orders/normal", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	req = httptest.NewRequest(http.MethodPost, "/orders/vip", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Get pending orders
	req = httptest.NewRequest(http.MethodGet, "/orders?status=pending", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var response OrdersResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Len(t, response.Orders, 2)

	// Get completed orders (should be empty)
	req = httptest.NewRequest(http.MethodGet, "/orders?status=completed", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	err = json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Len(t, response.Orders, 0)
}

func TestCreateBot(t *testing.T) {
	s := newTestServer(t)

	req := httptest.NewRequest(http.MethodPost, "/bots", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Verify bot was created
	req = httptest.NewRequest(http.MethodGet, "/bots", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var response BotsResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Len(t, response.Bots, 1)
	assert.Equal(t, "IDLE", response.Bots[0].Status)
}

func TestDeleteBot(t *testing.T) {
	s := newTestServer(t)

	// Create a bot first
	req := httptest.NewRequest(http.MethodPost, "/bots", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Delete the bot
	req = httptest.NewRequest(http.MethodDelete, "/bots", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Verify bot was deleted
	req = httptest.NewRequest(http.MethodGet, "/bots", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var response BotsResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Len(t, response.Bots, 0)
}

func TestDeleteBotWhenNoBots(t *testing.T) {
	s := newTestServer(t)

	req := httptest.NewRequest(http.MethodDelete, "/bots", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNoContent, rec.Code)
}

func TestGetStatus(t *testing.T) {
	s := newTestServer(t)

	// Create some orders and bots
	req := httptest.NewRequest(http.MethodPost, "/orders/normal", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	req = httptest.NewRequest(http.MethodPost, "/orders/vip", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	req = httptest.NewRequest(http.MethodPost, "/bots", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	// Get status
	req = httptest.NewRequest(http.MethodGet, "/status", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var response StatusResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.NotEmpty(t, response.Timestamp)
	assert.Len(t, response.Bots, 1)
	// VIP order is being processed, normal order is pending
	assert.Len(t, response.Pending, 1)
	assert.Len(t, response.Completed, 0)
}

func TestBotAssignsOrderAutomatically(t *testing.T) {
	s := newTestServer(t)

	// Create an order first
	req := httptest.NewRequest(http.MethodPost, "/orders/normal", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Create a bot (should automatically pick up the order)
	req = httptest.NewRequest(http.MethodPost, "/bots", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Check bot status
	req = httptest.NewRequest(http.MethodGet, "/bots", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	var botsResponse BotsResponse
	err := json.Unmarshal(rec.Body.Bytes(), &botsResponse)
	require.NoError(t, err)

	assert.Len(t, botsResponse.Bots, 1)
	assert.Equal(t, "PROCESSING", botsResponse.Bots[0].Status)
	assert.NotNil(t, botsResponse.Bots[0].CurrentOrderID)

	// Check order status
	req = httptest.NewRequest(http.MethodGet, "/orders", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	var ordersResponse OrdersResponse
	err = json.Unmarshal(rec.Body.Bytes(), &ordersResponse)
	require.NoError(t, err)

	assert.Equal(t, "PROCESSING", ordersResponse.Orders[0].Status)
}

func TestVIPOrderPriority(t *testing.T) {
	s := newTestServer(t)

	// Create normal order first
	req := httptest.NewRequest(http.MethodPost, "/orders/normal", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Create VIP order second
	req = httptest.NewRequest(http.MethodPost, "/orders/vip", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Check pending orders - VIP should be first
	req = httptest.NewRequest(http.MethodGet, "/orders?status=pending", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	var response OrdersResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Len(t, response.Orders, 2)

	// VIP order should be first in the list
	assert.Equal(t, "VIP", response.Orders[0].Type)
	assert.Equal(t, "NORMAL", response.Orders[1].Type)
}

func TestDeleteBotReturnsOrderToPending(t *testing.T) {
	s := newTestServer(t)

	// Create an order
	req := httptest.NewRequest(http.MethodPost, "/orders/normal", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Create a bot (will pick up the order)
	req = httptest.NewRequest(http.MethodPost, "/bots", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Verify order is processing
	req = httptest.NewRequest(http.MethodGet, "/orders", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	var response OrdersResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "PROCESSING", response.Orders[0].Status)

	// Delete the bot
	req = httptest.NewRequest(http.MethodDelete, "/bots", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Verify order is back to pending
	req = httptest.NewRequest(http.MethodGet, "/orders", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	err = json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "PENDING", response.Orders[0].Status)
}

func TestMultipleBots(t *testing.T) {
	s := newTestServer(t)

	// Create 3 bots
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodPost, "/bots", nil)
		rec := httptest.NewRecorder()
		s.Echo.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusNoContent, rec.Code)
	}

	// Verify 3 bots exist
	req := httptest.NewRequest(http.MethodGet, "/bots", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	var response BotsResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Len(t, response.Bots, 3)
}

func TestMultipleOrders(t *testing.T) {
	s := newTestServer(t)

	// Create 5 orders (3 normal, 2 VIP)
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodPost, "/orders/normal", nil)
		rec := httptest.NewRecorder()
		s.Echo.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusNoContent, rec.Code)
	}

	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/orders/vip", nil)
		rec := httptest.NewRecorder()
		s.Echo.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusNoContent, rec.Code)
	}

	// Verify 5 orders exist
	req := httptest.NewRequest(http.MethodGet, "/orders", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	var response OrdersResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Len(t, response.Orders, 5)
}

func TestDeleteNewestBot(t *testing.T) {
	s := newTestServer(t)

	// Create 3 bots
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodPost, "/bots", nil)
		rec := httptest.NewRecorder()
		s.Echo.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusNoContent, rec.Code)
	}

	// Delete bot (should delete the newest one - ID 3)
	req := httptest.NewRequest(http.MethodDelete, "/bots", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Verify remaining bots are ID 1 and 2
	req = httptest.NewRequest(http.MethodGet, "/bots", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	var response BotsResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Len(t, response.Bots, 2)
	assert.Equal(t, 1, response.Bots[0].ID)
	assert.Equal(t, 2, response.Bots[1].ID)
}

func TestBotTakes10SecondsToCompleteOrder(t *testing.T) {
	s := newTestServer(t)

	// Create an order
	req := httptest.NewRequest(http.MethodPost, "/orders/normal", nil)
	rec := httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Create a bot (will pick up the order)
	req = httptest.NewRequest(http.MethodPost, "/bots", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	// Verify order is processing
	req = httptest.NewRequest(http.MethodGet, "/orders", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	var response OrdersResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "PROCESSING", response.Orders[0].Status)

	// Wait 5 seconds - order should still be processing
	time.Sleep(5 * time.Second)

	req = httptest.NewRequest(http.MethodGet, "/orders", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	err = json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "PROCESSING", response.Orders[0].Status, "Order should still be processing after 5 seconds")

	// Wait another 6 seconds (total 11 seconds) - order should be complete
	time.Sleep(6 * time.Second)

	req = httptest.NewRequest(http.MethodGet, "/orders", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	err = json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "COMPLETE", response.Orders[0].Status, "Order should be complete after 10 seconds")

	// Verify bot is back to idle
	req = httptest.NewRequest(http.MethodGet, "/bots", nil)
	rec = httptest.NewRecorder()
	s.Echo.ServeHTTP(rec, req)

	var botsResponse BotsResponse
	err = json.Unmarshal(rec.Body.Bytes(), &botsResponse)
	require.NoError(t, err)
	assert.Equal(t, "IDLE", botsResponse.Bots[0].Status, "Bot should be idle after completing order")
	assert.Nil(t, botsResponse.Bots[0].CurrentOrderID, "Bot should have no current order after completing")
}
