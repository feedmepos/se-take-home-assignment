package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

var (
	mgr *Manager
)

type NewOrderRequest struct {
	Type OrderType `json:"type"`
}

type ManageBotRequest struct {
	Action string `json:"action"` // "add" or "remove"
}

// CORSMiddleware enables CORS
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func handleState(w http.ResponseWriter, r *http.Request) {
	mgr.mu.Lock()
	defer mgr.mu.Unlock()

	// Return a snapshot
	state := struct {
		Orders []*Order `json:"orders"`
		Bots   []*Bot   `json:"bots"`
	}{
		Orders: mgr.Orders,
		Bots:   mgr.Bots,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(state)
}

func handleOrders(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req NewOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	order := mgr.AddOrder(req.Type)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(order)
}

func handleBots(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ManageBotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Action == "add" {
		bot := mgr.AddBot()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(bot)
	} else if req.Action == "remove" {
		mgr.RemoveBot()
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"removed"}`))
	} else {
		http.Error(w, "Invalid action", http.StatusBadRequest)
	}
}

func main() {
	simulation := flag.Bool("simulation", false, "Run in simulation mode")
	flag.Parse()

	mgr = NewManager()

	if *simulation {
		fmt.Fprintln(os.Stderr, "Running in simulation mode...")

		// Simulation Scenario
		fmt.Fprintln(os.Stderr, "Adding Normal Order...")
		mgr.AddOrder(TypeNormal)
		
		fmt.Fprintln(os.Stderr, "Adding VIP Order...")
		mgr.AddOrder(TypeVIP)
		
		fmt.Fprintln(os.Stderr, "Adding Bot...")
		mgr.AddBot()
		
		// Wait for processing
		fmt.Fprintln(os.Stderr, "Waiting for order processing...")
		
		timeout := time.After(30 * time.Second)
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-timeout:
				fmt.Fprintln(os.Stderr, "Simulation timeout")
				return
			case <-ticker.C:
				allComplete := true
				mgr.mu.Lock()
				for _, o := range mgr.Orders {
					if o.Status != StatusComplete {
						allComplete = false
						break
					}
				}
				mgr.mu.Unlock()
				
				if allComplete && len(mgr.Orders) > 0 {
					fmt.Fprintln(os.Stderr, "All orders complete. Simulation finished.")
					return
				}
			}
		}
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/state", handleState)
	mux.HandleFunc("/api/orders", handleOrders)
	mux.HandleFunc("/api/bots", handleBots)

	handler := CORSMiddleware(mux)

	port := ":8080"
	fmt.Printf("Server starting on %s\n", port)
	if err := http.ListenAndServe(port, handler); err != nil {
		log.Fatal(err)
	}
}
