package api_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/api"
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
)

func newTestServer(t *testing.T) http.Handler {
	t.Helper()
	ctrl := controller.New(50*time.Millisecond, nil)
	return api.NewServer(ctrl, nil).Handler()
}

func decodeState(t *testing.T, body io.Reader) api.State {
	t.Helper()
	var st api.State
	if err := json.NewDecoder(body).Decode(&st); err != nil {
		t.Fatal(err)
	}
	return st
}

func TestAPI_CreateOrdersAndVIPOrder(t *testing.T) {
	h := newTestServer(t)

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/orders/normal", nil))
	if rr.Code != 200 {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	st := decodeState(t, rr.Body)
	if len(st.Pending) != 1 || st.Pending[0].Type != "NORMAL" {
		t.Fatalf("pending=%v", st.Pending)
	}

	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/orders/vip", nil))
	st = decodeState(t, rr.Body)
	if len(st.Pending) != 2 || st.Pending[0].Type != "VIP" || st.Pending[1].Type != "NORMAL" {
		t.Fatalf("VIP should lead pending: %v", st.Pending)
	}
}

func TestAPI_AddBotPicksUpAndProcessingVisible(t *testing.T) {
	h := newTestServer(t)
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/api/orders/normal", nil))

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/bots", nil))
	if rr.Code != 200 {
		t.Fatalf("status=%d", rr.Code)
	}

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		rr = httptest.NewRecorder()
		h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/state", nil))
		st := decodeState(t, rr.Body)
		if len(st.Processing) == 1 {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("expected processing order within timeout")
}

func TestAPI_RemoveBotEmpty404(t *testing.T) {
	h := newTestServer(t)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodDelete, "/api/bots", nil))
	if rr.Code != http.StatusNotFound {
		t.Fatalf("status=%d want 404", rr.Code)
	}
	var errBody map[string]string
	_ = json.NewDecoder(rr.Body).Decode(&errBody)
	if errBody["error"] == "" {
		t.Fatalf("expected error field, got %v", errBody)
	}
}

func TestAPI_RemoveBotOK(t *testing.T) {
	h := newTestServer(t)
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/api/bots", nil))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodDelete, "/api/bots", nil))
	if rr.Code != 200 {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	st := decodeState(t, rr.Body)
	if len(st.Bots) != 0 {
		t.Fatalf("bots=%v", st.Bots)
	}
}
