package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// 验证在注册 "/" FileServer 时，更具体的 /api/... 仍优先（与 cmd/server 装配方式一致）。
func TestServeMuxAPIBeforeRoot(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/orders/snapshot", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	})
	mux.Handle("/", http.FileServer(http.Dir(".")))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/orders/snapshot", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusTeapot {
		t.Fatalf("got status %d", rec.Code)
	}
}
