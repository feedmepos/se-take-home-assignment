package http

import (
	"net/http"

	"github.com/KhanitthaK/feedme-backend-service/internal/usecase"
)

// NewRouter builds the HTTP handler for the REST API using the stdlib
// method-aware ServeMux (Go 1.22+), wrapped with logging and CORS.
func NewRouter(ctrl *usecase.OrderController) http.Handler {
	h := NewHandler(ctrl)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/orders", h.CreateOrder)
	mux.HandleFunc("POST /api/bots", h.CreateBot)
	mux.HandleFunc("DELETE /api/bots", h.RemoveBot)
	mux.HandleFunc("GET /api/state", h.GetState)
	mux.HandleFunc("POST /api/reset", h.Reset)
	mux.HandleFunc("GET /healthz", h.Healthz)

	return Logging(CORS(mux))
}
