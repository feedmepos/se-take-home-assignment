// Package main 为 FeedMe HTTP API，供 Angular 与反向代理调用。
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/hanxipu/se-take-home-assignment/internal/feedme"
)

func main() {
	dur := feedme.ProcessDurationFromEnv(10 * time.Second)
	addr := listenAddr()
	e := feedme.NewEngine(dur)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/orders", func(w http.ResponseWriter, r *http.Request) {
		allowJSON(w, r)
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			Kind string `json:"kind"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, r, http.StatusBadRequest, map[string]string{"error": "invalid json"})
			return
		}
		k := feedme.OrderKind(strings.ToLower(strings.TrimSpace(body.Kind)))
		id, err := e.AddOrder(k)
		if err != nil {
			writeJSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, r, http.StatusCreated, map[string]interface{}{"id": id, "kind": k})
	})

	mux.HandleFunc("/api/bots", func(w http.ResponseWriter, r *http.Request) {
		allowJSON(w, r)
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			Action string `json:"action"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, r, http.StatusBadRequest, map[string]string{"error": "invalid json"})
			return
		}
		a := strings.ToLower(strings.TrimSpace(body.Action))
		switch a {
		case "add":
			id := e.AddBot()
			writeJSON(w, r, http.StatusCreated, map[string]int64{"id": id})
		case "remove":
			if err := e.RemoveNewestBot(); err != nil {
				writeJSON(w, r, http.StatusConflict, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, r, http.StatusOK, map[string]bool{"ok": true})
		default:
			writeJSON(w, r, http.StatusBadRequest, map[string]string{"error": "invalid bot action"})
		}
	})

	mux.HandleFunc("/api/state", func(w http.ResponseWriter, r *http.Request) {
		allowJSON(w, r)
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		st := e.Snapshot()
		w.Header().Set("Cache-Control", "no-store")
		writeJSON(w, r, http.StatusOK, st)
	})

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	log.Printf("FeedMe API listening on %s (process %v)\n", addr, dur)
	if err := http.ListenAndServe(addr, corsMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}

func listenAddr() string {
	if p := os.Getenv("PORT"); p != "" {
		if strings.HasPrefix(p, ":") {
			return p
		}
		return ":" + p
	}
	if a := os.Getenv("FEEDME_LISTEN"); a != "" {
		return a
	}
	return ":8080"
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		applyCORS(w, r)
		if r.Method == http.MethodOptions && strings.HasPrefix(r.URL.Path, "/api") {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func applyCORS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return
	}
	if strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1") {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	}
}

func allowJSON(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	applyCORS(w, r)
}

func writeJSON(w http.ResponseWriter, r *http.Request, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	applyCORS(w, r)
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}
