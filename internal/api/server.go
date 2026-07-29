package api

import (
	"encoding/json"
	"io/fs"
	"net/http"

	"github.com/Splinglove/se-take-home-assignment/internal/controller"
)

type Server struct {
	ctrl   *controller.Controller
	static fs.FS
}

func NewServer(ctrl *controller.Controller, static fs.FS) *Server {
	return &Server{ctrl: ctrl, static: static}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/state", s.handleState)
	mux.HandleFunc("POST /api/orders/normal", s.handleNormal)
	mux.HandleFunc("POST /api/orders/vip", s.handleVIP)
	mux.HandleFunc("POST /api/bots", s.handleAddBot)
	mux.HandleFunc("DELETE /api/bots", s.handleRemoveBot)
	if s.static != nil {
		fileServer := http.FileServer(http.FS(s.static))
		mux.Handle("/", fileServer)
	}
	return mux
}

func (s *Server) writeState(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(BuildState(s.ctrl.Snapshot()))
}

func (s *Server) writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func (s *Server) handleState(w http.ResponseWriter, r *http.Request) {
	s.writeState(w)
}

func (s *Server) handleNormal(w http.ResponseWriter, r *http.Request) {
	s.ctrl.CreateNormalOrder()
	s.writeState(w)
}

func (s *Server) handleVIP(w http.ResponseWriter, r *http.Request) {
	s.ctrl.CreateVIPOrder()
	s.writeState(w)
}

func (s *Server) handleAddBot(w http.ResponseWriter, r *http.Request) {
	s.ctrl.AddBot()
	s.writeState(w)
}

func (s *Server) handleRemoveBot(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.ctrl.RemoveBot(); !ok {
		s.writeError(w, http.StatusNotFound, "no bots to remove")
		return
	}
	s.writeState(w)
}
