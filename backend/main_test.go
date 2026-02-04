package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleState(t *testing.T) {
	// Setup
	mgr = NewManager()
	
	req, err := http.NewRequest("GET", "/api/state", nil)
	if err != nil {
		t.Fatal(err)
	}
	
	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(handleState)
	
	handler.ServeHTTP(rr, req)
	
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}
	
	var state struct {
		Orders []*Order `json:"orders"`
		Bots   []*Bot   `json:"bots"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&state); err != nil {
		t.Fatal(err)
	}
	
	if len(state.Orders) != 0 || len(state.Bots) != 0 {
		t.Errorf("Expected empty state")
	}
}

func TestHandleOrders(t *testing.T) {
	mgr = NewManager()
	
	payload := []byte(`{"type":"NORMAL"}`)
	req, err := http.NewRequest("POST", "/api/orders", bytes.NewBuffer(payload))
	if err != nil {
		t.Fatal(err)
	}
	
	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(handleOrders)
	
	handler.ServeHTTP(rr, req)
	
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}
	
	var order Order
	if err := json.NewDecoder(rr.Body).Decode(&order); err != nil {
		t.Fatal(err)
	}
	
	if order.Type != TypeNormal {
		t.Errorf("Expected Normal type")
	}
	
	if len(mgr.Orders) != 1 {
		t.Errorf("Expected order to be added to manager")
	}
}

func TestHandleBots(t *testing.T) {
	mgr = NewManager()
	
	// Add Bot
	payload := []byte(`{"action":"add"}`)
	req, err := http.NewRequest("POST", "/api/bots", bytes.NewBuffer(payload))
	if err != nil {
		t.Fatal(err)
	}
	
	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(handleBots)
	
	handler.ServeHTTP(rr, req)
	
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
	
	if len(mgr.Bots) != 1 {
		t.Errorf("Expected bot to be added")
	}
	
	// Remove Bot
	payload = []byte(`{"action":"remove"}`)
	req, err = http.NewRequest("POST", "/api/bots", bytes.NewBuffer(payload))
	if err != nil {
		t.Fatal(err)
	}
	
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
	
	if len(mgr.Bots) != 0 {
		t.Errorf("Expected bot to be removed")
	}
}
