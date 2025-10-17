package e2e_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"syscall"
	"testing"
	"time"
)

const (
	baseURL = "http://localhost:8080"
)

var serverCmd *exec.Cmd

// setupTest starts a fresh web service for each test
func setupTest(t *testing.T) {
	t.Helper()

	// Start the web service
	if err := startWebService(); err != nil {
		fmt.Printf("FATAL: Failed to start web service: %v\n", err)
		os.Exit(1)
	}

	// Wait for service to be ready
	if err := waitForService(5 * time.Second); err != nil {
		stopWebService()
		fmt.Printf("FATAL: Service failed to start: %v\n", err)
		os.Exit(1)
	}
}

// teardownTest stops the web service after test
func teardownTest(t *testing.T) {
	t.Helper()
	stopWebService()
}

// startWebService starts the web service using run.sh
func startWebService() error {
	// Path to run.sh script
	runScript := "../scripts/run.sh"

	// Check if run.sh exists
	if _, err := os.Stat(runScript); os.IsNotExist(err) {
		return fmt.Errorf("run.sh not found at %s", runScript)
	}

	// Start the service in background with its own process group
	serverCmd = exec.Command("bash", runScript)
	serverCmd.Stdout = os.Stdout
	serverCmd.Stderr = os.Stderr

	// Create new process group so we can kill the entire tree later
	serverCmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	if err := serverCmd.Start(); err != nil {
		return fmt.Errorf("failed to start service: %v", err)
	}

	return nil
}

// stopWebService stops the web service
func stopWebService() {
	if serverCmd != nil && serverCmd.Process != nil {
		fmt.Println("Stopping web service...")

		// Kill the entire process group (negative PID kills the process group)
		// This only kills processes started by our serverCmd, not other processes
		pgid := serverCmd.Process.Pid
		syscall.Kill(-pgid, syscall.SIGKILL)

		// Wait for process to exit
		serverCmd.Wait()

		// Give a brief moment for port to be released
		time.Sleep(300 * time.Millisecond)

		// Verify port is actually released, with timeout
		deadline := time.Now().Add(5 * time.Second)
		client := &http.Client{Timeout: 100 * time.Millisecond}

		for time.Now().Before(deadline) {
			_, err := client.Get(baseURL + "/api/dashboard")
			if err != nil {
				// Connection error means port is released
				return
			}
			time.Sleep(200 * time.Millisecond)
		}

		// Port still in use after 5 seconds, abort all tests
		fmt.Printf("FATAL: Port 8080 still in use after 5 seconds, aborting tests\n")
		os.Exit(1)
	}
}

// waitForService waits for the service to be ready
func waitForService(timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	client := &http.Client{Timeout: 1 * time.Second}

	for time.Now().Before(deadline) {
		resp, err := client.Get(baseURL + "/api/dashboard")
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}

		time.Sleep(500 * time.Millisecond)
	}

	return fmt.Errorf("service did not start within %v", timeout)
}

// Response structures
type APIResponse struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
}

type DashboardData struct {
	PendingOrders   []int `json:"pendingOrders"`
	CompletedOrders []int `json:"completedOrders"`
}

type OrderData struct {
	ID int `json:"id"`
}

type Bot struct {
	ID int `json:"id"`
}

// Helper function to make HTTP requests
func makeRequest(method, path string, body interface{}) (*http.Response, error) {
	var reqBody []byte
	var err error

	if body != nil {
		reqBody, err = json.Marshal(body)
		if err != nil {
			return nil, err
		}
	}

	req, err := http.NewRequest(method, baseURL+path, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	return client.Do(req)
}

// Test 1: Basic API endpoints existence and response format
func TestAPIEndpointsExist(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	t.Run("GET /api/dashboard should return valid response", func(t *testing.T) {
		resp, err := makeRequest("GET", "/api/dashboard", nil)
		if err != nil {
			t.Fatalf("Failed to make request: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var apiResp APIResponse
		if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if !apiResp.Success {
			t.Error("Expected success to be true")
		}
	})

	t.Run("GET /api/bots should return valid response", func(t *testing.T) {
		resp, err := makeRequest("GET", "/api/bots", nil)
		if err != nil {
			t.Fatalf("Failed to make request: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var apiResp APIResponse
		if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if !apiResp.Success {
			t.Error("Expected success to be true")
		}
	})
}

// Test 2: Order creation
func TestOrderCreation(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	t.Run("Create NORMAL order", func(t *testing.T) {
		orderReq := map[string]string{"type": "NORMAL"}
		resp, err := makeRequest("POST", "/api/orders", orderReq)
		if err != nil {
			t.Fatalf("Failed to create order: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var apiResp APIResponse
		if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if !apiResp.Success {
			t.Error("Expected success to be true")
		}

		var orderData OrderData
		if err := json.Unmarshal(apiResp.Data, &orderData); err != nil {
			t.Fatalf("Failed to decode order data: %v", err)
		}

		if orderData.ID <= 0 {
			t.Errorf("Expected positive order ID, got %d", orderData.ID)
		}
	})

	t.Run("Create VIP order", func(t *testing.T) {
		orderReq := map[string]string{"type": "VIP"}
		resp, err := makeRequest("POST", "/api/orders", orderReq)
		if err != nil {
			t.Fatalf("Failed to create order: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var apiResp APIResponse
		if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if !apiResp.Success {
			t.Error("Expected success to be true")
		}
	})
}

// Test 3: Order ID should be unique and increasing
func TestOrderIDUniqueness(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	orderIDs := make(map[int]bool)
	lastID := 0

	for i := 0; i < 5; i++ {
		orderReq := map[string]string{"type": "NORMAL"}
		resp, err := makeRequest("POST", "/api/orders", orderReq)
		if err != nil {
			t.Fatalf("Failed to create order: %v", err)
		}

		var apiResp APIResponse
		json.NewDecoder(resp.Body).Decode(&apiResp)
		resp.Body.Close()

		var orderData OrderData
		json.Unmarshal(apiResp.Data, &orderData)

		// Check uniqueness
		if orderIDs[orderData.ID] {
			t.Errorf("Duplicate order ID found: %d", orderData.ID)
		}
		orderIDs[orderData.ID] = true

		// Check if increasing
		if orderData.ID <= lastID {
			t.Errorf("Order ID not increasing: previous=%d, current=%d", lastID, orderData.ID)
		}
		lastID = orderData.ID
	}
}

// Test 4: VIP order priority
func TestVIPOrderPriority(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	// Create a clean state - we'll verify order priority through dashboard

	// Create NORMAL orders first
	normalReq := map[string]string{"type": "NORMAL"}
	resp1, _ := makeRequest("POST", "/api/orders", normalReq)
	var apiResp1 APIResponse
	json.NewDecoder(resp1.Body).Decode(&apiResp1)
	resp1.Body.Close()
	var normalOrder OrderData
	json.Unmarshal(apiResp1.Data, &normalOrder)

	resp2, _ := makeRequest("POST", "/api/orders", normalReq)
	var apiResp2 APIResponse
	json.NewDecoder(resp2.Body).Decode(&apiResp2)
	resp2.Body.Close()
	var normalOrder2 OrderData
	json.Unmarshal(apiResp2.Data, &normalOrder2)

	// Now create a VIP order
	vipReq := map[string]string{"type": "VIP"}
	resp3, _ := makeRequest("POST", "/api/orders", vipReq)
	var apiResp3 APIResponse
	json.NewDecoder(resp3.Body).Decode(&apiResp3)
	resp3.Body.Close()
	var vipOrder OrderData
	json.Unmarshal(apiResp3.Data, &vipOrder)

	// Check dashboard to verify VIP order is before NORMAL orders
	dashResp, _ := makeRequest("GET", "/api/dashboard", nil)
	var dashboardResp APIResponse
	json.NewDecoder(dashResp.Body).Decode(&dashboardResp)
	dashResp.Body.Close()

	var dashboard DashboardData
	json.Unmarshal(dashboardResp.Data, &dashboard)

	// VIP order should appear before NORMAL orders in pending queue
	if len(dashboard.PendingOrders) >= 3 {
		// Find positions
		vipPos := -1
		normalPos1 := -1
		normalPos2 := -1

		for i, id := range dashboard.PendingOrders {
			if id == vipOrder.ID {
				vipPos = i
			}
			if id == normalOrder.ID {
				normalPos1 = i
			}
			if id == normalOrder2.ID {
				normalPos2 = i
			}
		}

		if vipPos == -1 {
			t.Error("VIP order not found in pending orders")
		}

		if normalPos1 != -1 && vipPos > normalPos1 {
			t.Errorf("VIP order (pos %d) should be before NORMAL order (pos %d)", vipPos, normalPos1)
		}

		if normalPos2 != -1 && vipPos > normalPos2 {
			t.Errorf("VIP order (pos %d) should be before NORMAL order (pos %d)", vipPos, normalPos2)
		}
	}
}

// Test 5: Bot management
func TestBotManagement(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	t.Run("Add bot", func(t *testing.T) {
		resp, err := makeRequest("POST", "/api/bots", nil)
		if err != nil {
			t.Fatalf("Failed to add bot: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var apiResp APIResponse
		if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if !apiResp.Success {
			t.Error("Expected success to be true")
		}

		var botData Bot
		if err := json.Unmarshal(apiResp.Data, &botData); err != nil {
			t.Fatalf("Failed to decode bot data: %v", err)
		}

		if botData.ID <= 0 {
			t.Errorf("Expected positive bot ID, got %d", botData.ID)
		}
	})

	t.Run("Get all bots", func(t *testing.T) {
		// Add a bot first
		makeRequest("POST", "/api/bots", nil)

		// Get all bots
		resp, err := makeRequest("GET", "/api/bots", nil)
		if err != nil {
			t.Fatalf("Failed to get bots: %v", err)
		}
		defer resp.Body.Close()

		var apiResp APIResponse
		json.NewDecoder(resp.Body).Decode(&apiResp)

		var bots []Bot
		if err := json.Unmarshal(apiResp.Data, &bots); err != nil {
			t.Fatalf("Failed to decode bots data: %v", err)
		}

		if len(bots) == 0 {
			t.Error("Expected at least one bot")
		}
	})

	t.Run("Delete bot", func(t *testing.T) {
		// Add a bot
		addResp, _ := makeRequest("POST", "/api/bots", nil)
		var addAPIResp APIResponse
		json.NewDecoder(addResp.Body).Decode(&addAPIResp)
		addResp.Body.Close()

		var botData Bot
		json.Unmarshal(addAPIResp.Data, &botData)

		// Delete the bot
		deleteResp, err := makeRequest("DELETE", fmt.Sprintf("/api/bots/%d", botData.ID), nil)
		if err != nil {
			t.Fatalf("Failed to delete bot: %v", err)
		}
		defer deleteResp.Body.Close()

		if deleteResp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", deleteResp.StatusCode)
		}

		var apiResp APIResponse
		json.NewDecoder(deleteResp.Body).Decode(&apiResp)

		if !apiResp.Success {
			t.Error("Expected success to be true")
		}
	})
}

// Test 6: Bot processes orders (10 seconds)
func TestBotProcessingOrder(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping time-consuming test in short mode")
	}

	setupTest(t)
	defer teardownTest(t)

	// Create an order
	orderReq := map[string]string{"type": "NORMAL"}
	orderResp, _ := makeRequest("POST", "/api/orders", orderReq)
	var orderAPIResp APIResponse
	json.NewDecoder(orderResp.Body).Decode(&orderAPIResp)
	orderResp.Body.Close()

	var orderData OrderData
	json.Unmarshal(orderAPIResp.Data, &orderData)

	// Add a bot
	makeRequest("POST", "/api/bots", nil)

	// Wait for order to be processed (10 seconds + buffer)
	time.Sleep(11 * time.Second)

	// Check dashboard - order should be in completed
	dashResp, _ := makeRequest("GET", "/api/dashboard", nil)
	var dashboardResp APIResponse
	json.NewDecoder(dashResp.Body).Decode(&dashboardResp)
	dashResp.Body.Close()

	var dashboard DashboardData
	json.Unmarshal(dashboardResp.Data, &dashboard)

	// Check if order is in completed
	found := false
	for _, id := range dashboard.CompletedOrders {
		if id == orderData.ID {
			found = true
			break
		}
	}

	if !found {
		t.Errorf("Order %d should be in completed orders after 10 seconds", orderData.ID)
	}
}

// Test 7: Order appears in dashboard pending area
func TestOrderInDashboard(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	// Create an order
	orderReq := map[string]string{"type": "NORMAL"}
	orderResp, _ := makeRequest("POST", "/api/orders", orderReq)
	var orderAPIResp APIResponse
	json.NewDecoder(orderResp.Body).Decode(&orderAPIResp)
	orderResp.Body.Close()

	var orderData OrderData
	json.Unmarshal(orderAPIResp.Data, &orderData)

	// Check dashboard
	dashResp, _ := makeRequest("GET", "/api/dashboard", nil)
	var dashboardResp APIResponse
	json.NewDecoder(dashResp.Body).Decode(&dashboardResp)
	dashResp.Body.Close()

	var dashboard DashboardData
	json.Unmarshal(dashboardResp.Data, &dashboard)

	// Check if order is in pending
	found := false
	for _, id := range dashboard.PendingOrders {
		if id == orderData.ID {
			found = true
			break
		}
	}

	if !found {
		t.Errorf("Order %d should be in pending orders", orderData.ID)
	}
}

// Test 8: Multiple VIP orders maintain order
func TestMultipleVIPOrders(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	vipOrders := []int{}

	// Create multiple VIP orders
	for i := 0; i < 3; i++ {
		vipReq := map[string]string{"type": "VIP"}
		resp, _ := makeRequest("POST", "/api/orders", vipReq)
		var apiResp APIResponse
		json.NewDecoder(resp.Body).Decode(&apiResp)
		resp.Body.Close()

		var orderData OrderData
		json.Unmarshal(apiResp.Data, &orderData)
		vipOrders = append(vipOrders, orderData.ID)
	}

	// Check dashboard
	dashResp, _ := makeRequest("GET", "/api/dashboard", nil)
	var dashboardResp APIResponse
	json.NewDecoder(dashResp.Body).Decode(&dashboardResp)
	dashResp.Body.Close()

	var dashboard DashboardData
	json.Unmarshal(dashboardResp.Data, &dashboard)

	// VIP orders should appear in the order they were created
	positions := make(map[int]int)
	for i, id := range dashboard.PendingOrders {
		positions[id] = i
	}

	for i := 0; i < len(vipOrders)-1; i++ {
		pos1, ok1 := positions[vipOrders[i]]
		pos2, ok2 := positions[vipOrders[i+1]]

		if ok1 && ok2 && pos1 > pos2 {
			t.Errorf("VIP order %d (pos %d) should be before VIP order %d (pos %d)",
				vipOrders[i], pos1, vipOrders[i+1], pos2)
		}
	}
}
