package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/clock"
	"github.com/feedme/se-take-home-assignment/internal/repository/memory"
	"github.com/feedme/se-take-home-assignment/internal/service"
)

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	m := memory.NewMemory()
	k := service.NewKitchen(m, clock.FakeClock{}, service.WithCookDuration(time.Millisecond))
	s := &Server{Kitchen: k}
	mux := http.NewServeMux()
	s.Register(mux)
	return httptest.NewServer(mux)
}

func TestAPI_CreateAndSnapshot(t *testing.T) {
	ts := newTestServer(t)
	defer ts.Close()

	resp, err := ts.Client().Post(ts.URL+"/api/v1/orders", "application/json", strings.NewReader(`{"tier":"vip"}`))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}

	resp2, err := ts.Client().Get(ts.URL + "/api/v1/orders/snapshot")
	if err != nil {
		t.Fatal(err)
	}
	defer resp2.Body.Close()
	var snap service.Snapshot
	if err := json.NewDecoder(resp2.Body).Decode(&snap); err != nil {
		t.Fatal(err)
	}
	if len(snap.Pending) < 1 {
		t.Fatalf("expected pending order in snapshot %#v", snap)
	}
}

func TestAPI_BotsAndRemove(t *testing.T) {
	ts := newTestServer(t)
	defer ts.Close()

	resp, err := ts.Client().Post(ts.URL+"/api/v1/bots", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("add bot %d", resp.StatusCode)
	}

	req, _ := http.NewRequest(http.MethodDelete, ts.URL+"/api/v1/bots/latest", nil)
	resp2, err := ts.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp2.Body.Close()
	if resp2.StatusCode != http.StatusNoContent {
		t.Fatalf("remove %d", resp2.StatusCode)
	}
}
