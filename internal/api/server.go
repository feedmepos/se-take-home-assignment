package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/feedme/order-controller/internal/controller"
)

type Server struct {
	schedulerMu       sync.Mutex
	controller        *controller.Controller
	startedAt         time.Time
	lastSchedulerTick time.Time
	schedulerInterval time.Duration
	stopScheduler     chan struct{}
	schedulerDone     chan struct{}
	schedulerRunning  bool
}

type StateResponse struct {
	Pending       []OrderResponse `json:"pending"`
	Processing    []OrderResponse `json:"processing"`
	Completed     []OrderResponse `json:"completed"`
	Bots          []BotResponse   `json:"bots"`
	Events        []string        `json:"events"`
	TotalOrders   int             `json:"totalOrders"`
	CompletedVIP  int             `json:"completedVip"`
	CompletedNorm int             `json:"completedNormal"`
}

type OrderResponse struct {
	ID          int    `json:"id"`
	Kind        string `json:"kind"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt,omitempty"`
	StartedAt   string `json:"startedAt,omitempty"`
	CompletedAt string `json:"completedAt,omitempty"`
}

type BotResponse struct {
	ID          int    `json:"id"`
	Status      string `json:"status"`
	OrderID     int    `json:"orderId,omitempty"`
	OrderKind   string `json:"orderKind,omitempty"`
	CompleteAt  string `json:"completeAt,omitempty"`
	RemainingMs int64  `json:"remainingMs,omitempty"`
}

type orderRequest struct {
	Kind string `json:"kind"`
}

func NewServer() *Server {
	return newServer(controller.New(), 200*time.Millisecond)
}

func newServer(c *controller.Controller, schedulerInterval time.Duration) *Server {
	now := time.Now().Truncate(time.Second)
	c.Init(now)
	return &Server{
		controller:        c,
		startedAt:         now,
		lastSchedulerTick: now,
		schedulerInterval: schedulerInterval,
	}
}

func (s *Server) StartScheduler() {
	s.schedulerMu.Lock()
	defer s.schedulerMu.Unlock()

	if s.schedulerRunning {
		return
	}

	s.stopScheduler = make(chan struct{})
	s.schedulerDone = make(chan struct{})
	s.schedulerRunning = true

	go s.runScheduler()
}

func (s *Server) Close() {
	s.schedulerMu.Lock()
	if !s.schedulerRunning {
		s.schedulerMu.Unlock()
		return
	}
	stop := s.stopScheduler
	done := s.schedulerDone
	s.schedulerRunning = false
	s.schedulerMu.Unlock()

	close(stop)
	<-done
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("GET /api/state", s.state)
	mux.HandleFunc("POST /api/orders", s.createOrder)
	mux.HandleFunc("POST /api/bots", s.createBot)
	mux.HandleFunc("DELETE /api/bots/newest", s.deleteNewestBot)
	mux.HandleFunc("POST /api/reset", s.reset)
	return withCORS(mux)
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	s.schedulerMu.Lock()
	lastTick := s.lastSchedulerTick
	interval := s.schedulerInterval
	running := s.schedulerRunning
	s.schedulerMu.Unlock()

	if running && time.Since(lastTick) > maxDuration(5*time.Second, interval*10) {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status":    "unhealthy",
			"scheduler": "stale",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status":    "ok",
		"scheduler": schedulerStatus(running),
	})
}

func (s *Server) state(w http.ResponseWriter, _ *http.Request) {
	now := time.Now().Truncate(time.Second)
	writeJSON(w, http.StatusOK, s.response(now))
}

func (s *Server) createOrder(w http.ResponseWriter, r *http.Request) {
	var req orderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	kind := controller.Normal
	if strings.EqualFold(req.Kind, string(controller.VIP)) {
		kind = controller.VIP
	}

	now := time.Now().Truncate(time.Second)
	s.controller.AddOrder(kind, now)
	writeJSON(w, http.StatusCreated, s.response(now))
}

func (s *Server) createBot(w http.ResponseWriter, _ *http.Request) {
	now := time.Now().Truncate(time.Second)
	s.controller.AddBot(now)
	writeJSON(w, http.StatusCreated, s.response(now))
}

func (s *Server) deleteNewestBot(w http.ResponseWriter, _ *http.Request) {
	now := time.Now().Truncate(time.Second)
	s.controller.RemoveNewestBot(now)
	writeJSON(w, http.StatusOK, s.response(now))
}

func (s *Server) reset(w http.ResponseWriter, _ *http.Request) {
	now := time.Now().Truncate(time.Second)
	s.controller.Reset(now)
	s.startedAt = now
	s.schedulerMu.Lock()
	s.lastSchedulerTick = now
	s.schedulerMu.Unlock()
	writeJSON(w, http.StatusOK, s.response(now))
}

func (s *Server) runScheduler() {
	ticker := time.NewTicker(s.schedulerInterval)
	defer func() {
		ticker.Stop()
		close(s.schedulerDone)
	}()

	for {
		select {
		case now := <-ticker.C:
			s.safeAdvance(now)
		case <-s.stopScheduler:
			return
		}
	}
}

func (s *Server) safeAdvance(now time.Time) {
	defer func() {
		if recovered := recover(); recovered != nil {
			log.Printf("scheduler recovered from panic: %v", recovered)
		}
	}()

	s.controller.AdvanceTo(now)
	s.schedulerMu.Lock()
	s.lastSchedulerTick = time.Now()
	s.schedulerMu.Unlock()
}

func (s *Server) response(now time.Time) StateResponse {
	snapshot := s.controller.Snapshot()
	res := StateResponse{
		Pending:       make([]OrderResponse, 0, len(snapshot.Pending)),
		Processing:    make([]OrderResponse, 0),
		Completed:     make([]OrderResponse, 0, len(snapshot.Completed)),
		Bots:          make([]BotResponse, 0, len(snapshot.Bots)),
		Events:        s.controller.Events(),
		TotalOrders:   snapshot.TotalOrders,
		CompletedVIP:  snapshot.CompletedVIP,
		CompletedNorm: snapshot.CompletedNorm,
	}

	for _, order := range snapshot.Pending {
		res.Pending = append(res.Pending, orderResponse(order))
	}
	for _, order := range snapshot.Completed {
		res.Completed = append(res.Completed, orderResponse(order))
	}
	for _, bot := range snapshot.Bots {
		b := BotResponse{
			ID:     bot.ID,
			Status: string(bot.Status),
		}
		if bot.OrderID > 0 {
			b.OrderID = bot.OrderID
			b.OrderKind = string(bot.OrderKind)
			b.CompleteAt = formatTime(bot.CompleteAt)
			b.RemainingMs = max(0, bot.CompleteAt.Sub(now).Milliseconds())
			res.Processing = append(res.Processing, OrderResponse{
				ID:        bot.OrderID,
				Kind:      string(bot.OrderKind),
				Status:    string(controller.Processing),
				StartedAt: "",
			})
		}
		res.Bots = append(res.Bots, b)
	}

	return res
}

func orderResponse(order controller.Order) OrderResponse {
	return OrderResponse{
		ID:          order.ID,
		Kind:        string(order.Kind),
		Status:      string(order.Status),
		CreatedAt:   formatTime(order.CreatedAt),
		StartedAt:   formatTime(order.StartedAt),
		CompletedAt: formatTime(order.CompletedAt),
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format("15:04:05")
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func schedulerStatus(running bool) string {
	if running {
		return "running"
	}
	return "stopped"
}

func maxDuration(a, b time.Duration) time.Duration {
	if a > b {
		return a
	}
	return b
}
