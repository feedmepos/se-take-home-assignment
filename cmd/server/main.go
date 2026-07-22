// Package main 实现 order-server：一个 HTTP 服务，对外暴露订单/bot 管理 API，
// 内部用 order.Controller 调度。处理结果写到 -result 指定的文件。
//
// 优雅退出：收到 SIGINT/SIGTERM 后先 server.Shutdown 停止接收新连接，
// 再让 defer 链按 LIFO 顺序收尾（controller.Shutdown → WriteFinalStatus → file.Close）。
// 顺序很关键：必须先停 bot（让处理中的订单退回 pending）再写 Final Status，
// 否则统计里看不到退回的订单。
package main

import (
	"context"
	"errors"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/order"
)

func main() {
	addr := flag.String("addr", "127.0.0.1:18080", "HTTP listen address")
	resultPath := flag.String("result", "scripts/result.txt", "result file path")
	processing := flag.Duration("processing-duration", durationFromEnv("ORDER_PROCESSING_DURATION", 10*time.Second), "real processing duration per order")
	shutdownTimeout := flag.Duration("shutdown-timeout", 30*time.Second, "graceful shutdown timeout")
	flag.Parse()

	file, err := os.Create(*resultPath)
	if err != nil {
		log.Fatalf("create result file: %v", err)
	}
	defer file.Close()

	logger := order.NewEventLogger(file)
	controller := order.NewController(logger, *processing)
	// defer LIFO 执行顺序：Shutdown → WriteFinalStatus → file.Close
	// 必须先 Shutdown 让 bot 退单，WriteFinalStatus 才能看到准确的 pending 数。
	defer controller.WriteFinalStatus()
	defer controller.Shutdown()

	server := &http.Server{Addr: *addr, Handler: order.NewHTTPServer(controller)}
	serverErr := make(chan error, 1)
	go func() {
		log.Printf("order server listening on http://%s", *addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		log.Printf("server error: %v", err)
	case sig := <-sigCh:
		log.Printf("received %s, shutting down gracefully...", sig)
		ctx, cancel := context.WithTimeout(context.Background(), *shutdownTimeout)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			log.Printf("http shutdown error: %v", err)
		}
	}
}

// durationFromEnv 从环境变量解析 duration，支持 "10s"、"500ms"、"500"（毫秒）三种格式。
// 解析失败或未设置时返回 fallback。
func durationFromEnv(name string, fallback time.Duration) time.Duration {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}
	if d, err := time.ParseDuration(value); err == nil {
		return d
	}
	if ms, err := strconv.Atoi(value); err == nil {
		return time.Duration(ms) * time.Millisecond
	}
	return fallback
}
