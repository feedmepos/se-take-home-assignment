package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/KhanitthaK/feedme-backend-service/internal/usecase"
)

func newTestServer() http.Handler {
	// Short duration keeps the handler test fast.
	ctrl := usecase.NewOrderController(usecase.NewRealClock(), 20*time.Millisecond)
	return NewRouter(ctrl)
}

func TestCreateOrderEndpoint(t *testing.T) {
	srv := newTestServer()

	req := httptest.NewRequest(http.MethodPost, "/api/orders", strings.NewReader(`{"type":"VIP"}`))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201", rec.Code)
	}
	var body struct {
		Order OrderDTO `json:"order"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Order.ID != 1 || body.Order.Type != "VIP" || body.Order.Status != "PENDING" {
		t.Fatalf("unexpected order: %+v", body.Order)
	}
	if body.Order.CompletedAt != nil {
		t.Fatalf("completedAt should be null, got %v", *body.Order.CompletedAt)
	}
}

func TestCreateOrderInvalidTypeReturns400(t *testing.T) {
	srv := newTestServer()
	req := httptest.NewRequest(http.MethodPost, "/api/orders", strings.NewReader(`{"type":"GOLD"}`))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestRemoveBotNoneReturns409(t *testing.T) {
	srv := newTestServer()
	req := httptest.NewRequest(http.MethodDelete, "/api/bots", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want 409", rec.Code)
	}
	var body map[string]string
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if body["error"] != "no bots to remove" {
		t.Fatalf("error = %q, want %q", body["error"], "no bots to remove")
	}
}

func TestStateShapeArraysNotNull(t *testing.T) {
	srv := newTestServer()
	req := httptest.NewRequest(http.MethodGet, "/api/state", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	// Arrays must serialise as [] not null so the frontend can rely on them.
	for _, key := range []string{`"pending":[]`, `"processing":[]`, `"complete":[]`, `"bots":[]`} {
		if !strings.Contains(rec.Body.String(), key) {
			t.Fatalf("state body missing %s: %s", key, rec.Body.String())
		}
	}
}

func TestHealthz(t *testing.T) {
	srv := newTestServer()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || rec.Body.String() != "ok" {
		t.Fatalf("healthz = %d %q, want 200 ok", rec.Code, rec.Body.String())
	}
}

func TestCORSPreflight(t *testing.T) {
	srv := newTestServer()
	req := httptest.NewRequest(http.MethodOptions, "/api/orders", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("preflight status = %d, want 204", rec.Code)
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatal("missing CORS allow-origin header")
	}
}
