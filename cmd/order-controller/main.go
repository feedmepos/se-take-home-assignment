// 订单控制器 CLI 入口：支持批处理、交互式 REPL 与 stdin 管道三种运行模式。
package main

import (
	"flag"
	"os"
	"time"

	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/cli"
	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/config"
)

func main() {
	batch := flag.String("batch", "", "path to batch command script")
	interactive := flag.Bool("interactive", false, "run interactive REPL")
	processDur := flag.Duration("process-duration", 10*time.Second, "order processing duration")
	flag.Parse()

	// 依赖方向：main → config.Wire → application + infrastructure 适配器。
	app := config.Wire(os.Stdout, *processDur)
	// 退出前取消所有 Bot 处理定时器，避免 goroutine 泄漏。
	defer app.Service.Shutdown()

	var err error
	switch {
	case *batch != "":
		err = cli.RunBatch(app.Service, *batch)
	case *interactive:
		// 错误输出到 stderr，事件日志仍在 stdout。
		err = cli.RunREPL(app.Service, os.Stdin, os.Stderr)
	default:
		// 无 flag 时从 stdin 读批处理命令（管道模式）。
		err = cli.RunBatchReader(app.Service, os.Stdin)
	}

	if err != nil {
		os.Exit(1)
	}
}
