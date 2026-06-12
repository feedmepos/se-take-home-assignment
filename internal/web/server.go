package web

import (
	"bufio"
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/se-take-home-assignment/internal/controller"
	"github.com/se-take-home-assignment/internal/model"
)

//go:embed static
var staticFiles embed.FS

// Server is the HTTP server wrapping the order controller.
type Server struct {
	ctrl    *controller.Controller
	clients map[chan string]struct{}
	mu      sync.Mutex
	server  *http.Server
}

// New creates a new web server backed by the given controller.
func New(ctrl *controller.Controller) *Server {
	return &Server{
		ctrl:    ctrl,
		clients: make(map[chan string]struct{}),
	}
}

// orderDTO is the JSON representation of an order.
type orderDTO struct {
	ID   int64  `json:"id"`
	Type string `json:"type"`
}

// statusDTO is the JSON response for /api/status.
type statusDTO struct {
	Bots       int        `json:"bots"`
	Pending    []orderDTO `json:"pending"`
	Processing []orderDTO `json:"processing"`
	Completed  []orderDTO `json:"completed"`
}

func toDTO(orders []*model.Order) []orderDTO {
	result := make([]orderDTO, 0, len(orders))
	for _, o := range orders {
		t := "normal"
		if o.Type == model.VIP {
			t = "vip"
		}
		result = append(result, orderDTO{ID: o.ID, Type: t})
	}
	return result
}

func (s *Server) buildStatus() statusDTO {
	return statusDTO{
		Bots:       s.ctrl.BotCount(),
		Pending:    toDTO(s.ctrl.PendingOrders()),
		Processing: toDTO(s.ctrl.ProcessingOrders()),
		Completed:  toDTO(s.ctrl.CompletedOrders()),
	}
}

// broadcast sends a status update to all SSE clients.
func (s *Server) broadcast() {
	data, _ := json.Marshal(s.buildStatus())
	msg := fmt.Sprintf("data: %s\n\n", data)
	s.mu.Lock()
	for ch := range s.clients {
		select {
		case ch <- msg:
		default:
		}
	}
	s.mu.Unlock()
}

// Write implements io.Writer. It tees controller logs to stdout and SSE.
func (s *Server) Write(p []byte) (n int, err error) {
	// Write to stdout
	n, err = os.Stdout.Write(p)
	// Broadcast each line to SSE clients
	scanner := bufio.NewScanner(bytes.NewReader(p))
	for scanner.Scan() {
		line := scanner.Text()
		if line != "" {
			s.broadcastLog(line)
		}
	}
	return
}

// broadcastLog sends a log message to all SSE clients.
func (s *Server) broadcastLog(msg string) {
	event := fmt.Sprintf("event: log\ndata: %s\n\n", msg)
	s.mu.Lock()
	for ch := range s.clients {
		select {
		case ch <- event:
		default:
		}
	}
	s.mu.Unlock()
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s.buildStatus())
}

func (s *Server) handleNewOrder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Type string `json:"type"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	orderType := model.Normal
	if req.Type == "vip" {
		orderType = model.VIP
	}
	s.ctrl.NewOrder(orderType)
	s.broadcast()
	w.WriteHeader(http.StatusCreated)
}

func (s *Server) handleBot(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		s.ctrl.AddBot()
		s.broadcast()
		w.WriteHeader(http.StatusCreated)
	case http.MethodDelete:
		s.ctrl.RemoveBot()
		s.broadcast()
		w.WriteHeader(http.StatusOK)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleShutdown(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.WriteHeader(http.StatusOK)
	go func() {
		time.Sleep(100 * time.Millisecond)
		s.server.Close()
	}()
}

func (s *Server) handleEvents(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	ch := make(chan string, 16)
	s.mu.Lock()
	s.clients[ch] = struct{}{}
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.clients, ch)
		s.mu.Unlock()
	}()

	// Send initial state
	data, _ := json.Marshal(s.buildStatus())
	fmt.Fprintf(w, "data: %s\n\n", data)
	flusher.Flush()

	for {
		select {
		case msg := <-ch:
			io.WriteString(w, msg)
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}

// Start launches the HTTP server and a background ticker for status updates.
func (s *Server) Start(addr string) error {
	// Intercept controller logs: write to stdout + broadcast to SSE
	s.ctrl.SetOutput(s)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/status", s.handleStatus)
	mux.HandleFunc("/api/order", s.handleNewOrder)
	mux.HandleFunc("/api/bot", s.handleBot)
	mux.HandleFunc("/api/events", s.handleEvents)
	mux.HandleFunc("/api/shutdown", s.handleShutdown)

	// Serve embedded static files (strip "static" prefix so / serves index.html)
	staticFS, _ := fs.Sub(staticFiles, "static")
	mux.Handle("/", http.FileServer(http.FS(staticFS)))

	// Background ticker to push state (handles async bot completions)
	go func() {
		ticker := time.NewTicker(500 * time.Millisecond)
		defer ticker.Stop()
		for range ticker.C {
			s.broadcast()
		}
	}()

	s.server = &http.Server{Addr: addr, Handler: mux}
	fmt.Printf("[%s] Web server starting at http://localhost%s\n", time.Now().Format("15:04:05"), addr)
	return s.server.ListenAndServe()
}
