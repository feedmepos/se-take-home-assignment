package cmd

import (
	"fmt"
	"ordercontroller/controller"
	"ordercontroller/server"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"
)

var port int

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "启动 HTTP 服务器",
	Long:  "启动 HTTP + WebSocket 服务器，提供 RESTful API 和实时事件推送",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runServe()
	},
}

func init() {
	serveCmd.Flags().IntVarP(&port, "port", "p", 8080, "服务监听端口")
	rootCmd.AddCommand(serveCmd)
}

func runServe() error {
	clk := controller.RealClock{}
	ctrl := controller.NewController(nil, clk)
	srv := server.NewServer(ctrl)

	addr := fmt.Sprintf(":%d", port)
	fmt.Printf("服务器启动在 http://localhost:%d\n", port)
	fmt.Println("API 端点:")
	fmt.Println("  POST   /api/v1/orders/normal  - 创建普通订单")
	fmt.Println("  POST   /api/v1/orders/vip     - 创建 VIP 订单")
	fmt.Println("  GET    /api/v1/orders        - 获取所有订单")
	fmt.Println("  POST   /api/v1/bots           - 添加 Bot")
	fmt.Println("  DELETE /api/v1/bots           - 移除最新 Bot")
	fmt.Println("  GET    /api/v1/status        - 获取系统状态")
	fmt.Println("  WS     /ws/events           - 实时事件推送")
	fmt.Println()

	// 优雅关闭
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		fmt.Println("\n正在关闭服务器...")
		os.Exit(0)
	}()

	return srv.Start(addr)
}
