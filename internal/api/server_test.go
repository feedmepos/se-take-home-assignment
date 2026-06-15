package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/feedme/order-controller/internal/controller"
)

func TestAPIOrderAndBotFlow(t *testing.T) {
	server := NewServer()
	handler := server.Handler()

	postJSON(t, handler, "/api/orders", map[string]string{"kind": "Normal"})
	postJSON(t, handler, "/api/orders", map[string]string{"kind": "VIP"})
	postJSON(t, handler, "/api/bots", map[string]string{})

	res := getState(t, handler)
	if len(res.Pending) != 1 || res.Pending[0].Kind != "Normal" {
		t.Fatalf("pending = %+v, want only normal order waiting", res.Pending)
	}
	if len(res.Processing) != 1 || res.Processing[0].Kind != "VIP" {
		t.Fatalf("processing = %+v, want VIP order processing first", res.Processing)
	}
	if len(res.Bots) != 1 || res.Bots[0].Status != "PROCESSING" {
		t.Fatalf("bots = %+v, want one processing bot", res.Bots)
	}
}

func TestSchedulerCompletesOrderWithoutStateRequestAdvancingTime(t *testing.T) {
	server := newServer(controller.NewWithProcessTime(20*time.Millisecond), 5*time.Millisecond)
	server.StartScheduler()
	defer server.Close()
	handler := server.Handler()

	postJSON(t, handler, "/api/orders", map[string]string{"kind": "Normal"})
	postJSON(t, handler, "/api/bots", map[string]string{})

	time.Sleep(80 * time.Millisecond)

	res := getState(t, handler)
	if len(res.Completed) != 1 || res.Completed[0].ID != 1001 {
		t.Fatalf("completed = %+v, want order #1001 completed by scheduler", res.Completed)
	}
	if len(res.Processing) != 0 {
		t.Fatalf("processing = %+v, want no processing orders", res.Processing)
	}
}

func postJSON(t *testing.T, handler http.Handler, path string, body any) {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code < 200 || rec.Code > 299 {
		t.Fatalf("POST %s status = %d, body = %s", path, rec.Code, rec.Body.String())
	}
}

func getState(t *testing.T, handler http.Handler) StateResponse {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/state", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/state status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var res StateResponse
	if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
		t.Fatal(err)
	}
	return res
}
