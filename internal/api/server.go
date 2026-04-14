package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/domain"
	"github.com/feedme/se-take-home-assignment/internal/service"
)

// Server HTTP API（DESIGN §2）。
type Server struct {
	Kitchen *service.Kitchen
}

func (s *Server) Register(mux *http.ServeMux) {
	mux.HandleFunc("/healthz", s.handleHealth)
	mux.HandleFunc("/api/v1/orders/snapshot", s.handleSnapshot)
	mux.HandleFunc("/api/v1/orders", s.handleOrders)
	mux.HandleFunc("/api/v1/orders/", s.handleOrderSubpath)
	mux.HandleFunc("/api/v1/bots/latest", s.handleBotLatest)
	mux.HandleFunc("/api/v1/bots", s.handleBots)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func (s *Server) handleSnapshot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	snap, err := s.Kitchen.Snapshot(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, snap)
}

type createOrderBody struct {
	Tier string `json:"tier"`
}

func (s *Server) handleOrders(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		var body createOrderBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		var tier domain.Tier
		switch strings.ToLower(strings.TrimSpace(body.Tier)) {
		case "vip":
			tier = domain.TierVIP
		case "normal":
			tier = domain.TierNormal
		default:
			http.Error(w, `tier must be "vip" or "normal"`, http.StatusBadRequest)
			return
		}
		o, err := s.Kitchen.CreateOrder(r.Context(), tier)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, OrderToAPI(o))
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleOrderSubpath(w http.ResponseWriter, r *http.Request) {
	// /api/v1/orders/{id}/retry
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/orders/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 || parts[1] != "retry" {
		http.NotFound(w, r)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	idU, err := strconv.ParseUint(parts[0], 10, 64)
	if err != nil {
		http.Error(w, "bad id", http.StatusBadRequest)
		return
	}
	if err := s.Kitchen.RetryOrder(r.Context(), domain.OrderID(idU)); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleBots(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		snap, err := s.Kitchen.Snapshot(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, snap.Bots)
	case http.MethodPost:
		b, err := s.Kitchen.AddBot(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, b)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleBotLatest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := s.Kitchen.RemoveBot(r.Context()); err != nil {
		if err == service.ErrNoBot {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(true)
	_ = enc.Encode(v)
}

// OrderToAPI 导出给 handler 使用。
func OrderToAPI(o *domain.Order) map[string]any {
	if o == nil {
		return nil
	}
	m := map[string]any{
		"id":     uint64(o.ID),
		"tier":   tierAPI(o.Tier),
		"status": statusAPI(o.Status),
	}
	if o.BotID != nil {
		m["assigned_bot_id"] = uint64(*o.BotID)
	}
	if !o.CreatedAt.IsZero() {
		m["created_at"] = o.CreatedAt.UTC().Format(time.RFC3339Nano)
	}
	if !o.StartedAt.IsZero() {
		m["started_at"] = o.StartedAt.UTC().Format(time.RFC3339Nano)
	}
	if !o.CompletedAt.IsZero() {
		m["completed_at"] = o.CompletedAt.UTC().Format(time.RFC3339Nano)
	}
	return m
}

func tierAPI(t domain.Tier) string {
	if t == domain.TierVIP {
		return "vip"
	}
	return "normal"
}

func statusAPI(s domain.OrderStatus) string {
	switch s {
	case domain.OrderPending:
		return "pending"
	case domain.OrderProcessing:
		return "processing"
	case domain.OrderComplete:
		return "complete"
	case domain.OrderException:
		return "exception"
	default:
		return "unknown"
	}
}

// WithCORS 开发用跨域。
func WithCORS(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h.ServeHTTP(w, r)
	})
}
