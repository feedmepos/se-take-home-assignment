package api

import (
	"encoding/json"
	"net/http"

	"github.com/feedme/order-controller/internal/core"
	"github.com/feedme/order-controller/internal/engine"
)

type Handler struct {
	engine *engine.Engine
}

func NewHandler(e *engine.Engine) *Handler {
	return &Handler{engine: e}
}

func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type string `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	orderType := core.Normal
	if req.Type == "vip" {
		orderType = core.VIP
	}

	o := h.engine.AddOrder(orderType)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(o)
}

func (h *Handler) AddBot(w http.ResponseWriter, r *http.Request) {
	b := h.engine.AddBot()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(b)
}

func (h *Handler) RemoveBot(w http.ResponseWriter, r *http.Request) {
	h.engine.RemoveBot()
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetState(w http.ResponseWriter, r *http.Request) {
	state := h.engine.State()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(state)
}
