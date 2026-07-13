// Command orderbotweb 是「自动做菜机器人」的 Web 版：
// 提供一个单页控制台（按钮 + PENDING/COMPLETE/机器人状态），
// 复用 kitchen 核心逻辑，通过 HTTP + JSON 交互。
package main

import (
	"context"
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"time"

	"orderbot/kitchen"
)

//go:embed web/index.html
var content embed.FS

type orderJSON struct {
	ID   int    `json:"id"`
	Type string `json:"type"`
}

type botJSON struct {
	ID      int `json:"id"`
	Cooking int `json:"cooking"` // 0 表示空闲
}

type stateJSON struct {
	Cook     string      `json:"cook"`
	Pending  []orderJSON `json:"pending"`
	Complete []orderJSON `json:"complete"`
	Bots     []botJSON   `json:"bots"`
}

func main() {
	addr := flag.String("addr", ":8080", "监听地址")
	cook := flag.Duration("cook", 10*time.Second, "每张订单的烹饪耗时")
	flag.Parse()

	c := kitchen.New(*cook, func(msg string) {
		fmt.Println(time.Now().Format("15:04:05"), "|", msg)
	})

	mux := http.NewServeMux()

	// 静态页
	page, _ := content.ReadFile("web/index.html")
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(page)
	})

	// 动作接口（POST）
	mux.HandleFunc("POST /api/order/normal", func(w http.ResponseWriter, r *http.Request) { c.NewOrder(kitchen.Normal); ok(w) })
	mux.HandleFunc("POST /api/order/vip", func(w http.ResponseWriter, r *http.Request) { c.NewOrder(kitchen.VIP); ok(w) })
	mux.HandleFunc("POST /api/bot/add", func(w http.ResponseWriter, r *http.Request) { c.AddBot(); ok(w) })
	mux.HandleFunc("POST /api/bot/remove", func(w http.ResponseWriter, r *http.Request) { c.RemoveBot(); ok(w) })

	// 状态接口（GET）
	mux.HandleFunc("GET /api/state", func(w http.ResponseWriter, r *http.Request) {
		s := c.Snapshot()
		resp := stateJSON{
			Cook:     cook.String(),
			Pending:  []orderJSON{},
			Complete: []orderJSON{},
			Bots:     []botJSON{},
		}
		for _, o := range s.Pending {
			resp.Pending = append(resp.Pending, orderJSON{o.ID, o.Type.String()})
		}
		for _, o := range s.Complete {
			resp.Complete = append(resp.Complete, orderJSON{o.ID, o.Type.String()})
		}
		for _, b := range s.Bots {
			resp.Bots = append(resp.Bots, botJSON{b.ID, b.Cooking})
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})

	srv := &http.Server{Addr: *addr, Handler: mux}

	// 优雅收尾：Ctrl-C 时停机器人 + 关服务
	go func() {
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, os.Interrupt)
		<-stop
		fmt.Println("\n正在关闭…")
		c.Shutdown()
		srv.Shutdown(context.Background())
	}()

	fmt.Printf("订单控制台已启动: http://localhost%s  (烹饪耗时 %s)\n", *addr, cook.String())
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		fmt.Fprintln(os.Stderr, "server error:", err)
		os.Exit(1)
	}
}

func ok(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}
