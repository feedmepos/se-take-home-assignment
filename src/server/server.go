package server

import (
	"context"
	"encoding/json"
	"net/http"
	"ordercontroller/controller"
	"sync"
	"time"

	"github.com/coder/websocket"
)

// APIResponse 统一 API 响应
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// WSHub WebSocket 连接管理
type WSHub struct {
	mu      sync.Mutex
	clients map[*websocket.Conn]struct{}
}

func NewWSHub() *WSHub {
	return &WSHub{clients: make(map[*websocket.Conn]struct{})}
}

func (h *WSHub) Register(conn *websocket.Conn) {
	h.mu.Lock()
	h.clients[conn] = struct{}{}
	h.mu.Unlock()
}

func (h *WSHub) Unregister(conn *websocket.Conn) {
	h.mu.Lock()
	delete(h.clients, conn)
	h.mu.Unlock()
	conn.CloseNow()
}

func (h *WSHub) Broadcast(e controller.Event) {
	data, err := json.Marshal(map[string]interface{}{
		"type":      e.Type,
		"timestamp": e.Timestamp.Format("15:04:05"),
		"data":      e.Data,
	})
	if err != nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	for conn := range h.clients {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		conn.Write(ctx, websocket.MessageText, data)
		cancel()
	}
}

// Server HTTP 服务器
type Server struct {
	ctrl *controller.Controller
	hub  *WSHub
}

func NewServer(ctrl *controller.Controller) *Server {
	s := &Server{
		ctrl: ctrl,
		hub:  NewWSHub(),
	}

	// 设置事件广播
	ctrl.SetEventHandler(func(e controller.Event) {
		s.hub.Broadcast(e)
	})

	return s
}

// Handler 获取路由器
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/v1/orders/normal", s.handleCreateNormalOrder)
	mux.HandleFunc("POST /api/v1/orders/vip", s.handleCreateVIPOrder)
	mux.HandleFunc("GET /api/v1/orders", s.handleGetOrders)
	mux.HandleFunc("POST /api/v1/bots", s.handleAddBot)
	mux.HandleFunc("DELETE /api/v1/bots", s.handleRemoveBot)
	mux.HandleFunc("GET /api/v1/status", s.handleGetStatus)
	mux.HandleFunc("DELETE /api/v1/reset", s.handleReset)
	mux.HandleFunc("/ws/events", s.handleWebSocket)

	mux.HandleFunc("/", s.handleSPA)

	return mux
}

// Start 启动服务器
func (s *Server) Start(addr string) error {
	return http.ListenAndServe(addr, s.Handler())
}

func (s *Server) handleCreateNormalOrder(w http.ResponseWriter, r *http.Request) {
	order := s.ctrl.NewOrder(controller.OrderNormal)
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: orderToJSON(order)})
}

func (s *Server) handleCreateVIPOrder(w http.ResponseWriter, r *http.Request) {
	order := s.ctrl.NewOrder(controller.OrderVIP)
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: orderToJSON(order)})
}

func (s *Server) handleGetOrders(w http.ResponseWriter, r *http.Request) {
	orders := s.ctrl.GetOrders()
	result := make([]map[string]interface{}, 0, len(orders))
	for _, o := range orders {
		result = append(result, orderToJSON(o))
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

func (s *Server) handleAddBot(w http.ResponseWriter, r *http.Request) {
	botID := s.ctrl.AddBot()
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{"bot_id": botID, "status": "ACTIVE"},
	})
}

func (s *Server) handleRemoveBot(w http.ResponseWriter, r *http.Request) {
	err := s.ctrl.RemoveBot()
	if err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Error: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (s *Server) handleGetStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: s.ctrl.GetStatus()})
}

func (s *Server) handleReset(w http.ResponseWriter, r *http.Request) {
	s.ctrl.Reset()
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	defer conn.CloseNow()

	s.hub.Register(conn)
	defer s.hub.Unregister(conn)

	for {
		_, _, err := conn.Read(r.Context())
		if err != nil {
			return
		}
	}
}

func (s *Server) handleSPA(w http.ResponseWriter, r *http.Request) {
	serveSPA(w, r)
}

func orderToJSON(o *controller.Order) map[string]interface{} {
	result := map[string]interface{}{
		"id":         o.ID,
		"type":       o.Type.String(),
		"status":     o.Status.String(),
		"bot_id":     o.BotID,
		"created_at": o.CreatedAt.Format("15:04:05"),
	}
	if o.ProcessingAt != nil {
		result["processing_at"] = o.ProcessingAt.Format("15:04:05")
	}
	if o.CompletedAt != nil {
		result["completed_at"] = o.CompletedAt.Format("15:04:05")
	}
	return result
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
