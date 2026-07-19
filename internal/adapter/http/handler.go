package http

import (
	"encoding/json"
	"net/http"

	"github.com/KhanitthaK/feedme-backend-service/internal/domain"
	"github.com/KhanitthaK/feedme-backend-service/internal/usecase"
)

// Handler wires HTTP endpoints to the OrderController use case.
type Handler struct {
	ctrl *usecase.OrderController
}

// NewHandler builds a Handler.
func NewHandler(ctrl *usecase.OrderController) *Handler {
	return &Handler{ctrl: ctrl}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

type createOrderRequest struct {
	Type string `json:"type"`
}

// CreateOrder handles POST /api/orders.
func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	var req createOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	order, err := h.ctrl.CreateOrder(domain.OrderType(req.Type))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]OrderDTO{"order": toOrderDTO(order)})
}

// CreateBot handles POST /api/bots.
func (h *Handler) CreateBot(w http.ResponseWriter, r *http.Request) {
	bot := h.ctrl.AddBot()
	writeJSON(w, http.StatusCreated, map[string]BotDTO{"bot": botDTOFromDomain(bot)})
}

// RemoveBot handles DELETE /api/bots.
func (h *Handler) RemoveBot(w http.ResponseWriter, r *http.Request) {
	id, err := h.ctrl.RemoveBot()
	if err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"removedBotId": id})
}

// GetState handles GET /api/state.
func (h *Handler) GetState(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, toStateDTO(h.ctrl.GetState()))
}

// Reset handles POST /api/reset.
func (h *Handler) Reset(w http.ResponseWriter, r *http.Request) {
	h.ctrl.Reset()
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// Healthz handles GET /healthz with a plain-text "ok".
func (h *Handler) Healthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}
