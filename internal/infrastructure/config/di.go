// Package config 是组合根（Composition Root），负责组装应用层依赖。
package config

import (
	"io"
	"time"

	app "github.com/lijian-bj/se-take-home-assignment/internal/application/ordercontroller"
	"github.com/lijian-bj/se-take-home-assignment/internal/application/port"
	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/clock"
	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/logging"
)

// Application 持有 CLI 运行所需的全部已装配依赖。
type Application struct {
	Service *app.Service // 应用服务
	Clock   port.Clock   // 时钟（生产环境为 Real）
	Log     port.EventLog // 事件日志
}

// Wire 构建依赖图：Real 时钟 → EventLogger → Service，并触发系统启动日志。
func Wire(out io.Writer, processDuration time.Duration) *Application {
	clk := clock.Real{}
	// 日志与时间戳共用同一 Clock，保证 HH:MM:SS 与定时器语义一致。
	logger := logging.New(out, clk)
	svc := app.NewService(clk, logger, processDuration)
	svc.Start()
	return &Application{
		Service: svc,
		Clock:   clk,
		Log:     logger,
	}
}
