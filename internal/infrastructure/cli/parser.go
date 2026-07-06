// Package cli 提供命令解析与三种运行模式：交互 REPL、批处理文件、stdin 管道。
package cli

import (
	"fmt"
	"strings"
	"time"
)

// Command 表示解析后的 CLI 命令类型。
type Command int

const (
	CmdNormal Command = iota // 创建普通订单
	CmdVIP                   // 创建 VIP 订单
	CmdAddBot                // 增加 Bot
	CmdRemoveBot             // 移除最新 Bot
	CmdStatus                // 打印状态快照
	CmdQuit                  // 退出
	CmdWait                  // 等待系统空闲
)

// Parse 将用户输入行解析为命令类型，支持别名（如 n/v/s/q）。
func Parse(line string) (Command, error) {
	line = strings.ToLower(strings.TrimSpace(line))
	switch line {
	case "normal", "n":
		return CmdNormal, nil
	case "vip", "v":
		return CmdVIP, nil
	case "+bot", "addbot":
		return CmdAddBot, nil
	case "-bot", "removebot":
		return CmdRemoveBot, nil
	case "status", "s":
		return CmdStatus, nil
	case "quit", "q":
		return CmdQuit, nil
	default:
		if strings.HasPrefix(line, "wait ") {
			return CmdWait, nil
		}
		return 0, fmt.Errorf("unknown command: %s", line)
	}
}

// ParseWaitDuration 从 "wait <duration>" 命令中解析等待超时时间（如 "wait 5s"）。
func ParseWaitDuration(line string) (time.Duration, error) {
	line = strings.TrimSpace(strings.TrimPrefix(strings.ToLower(line), "wait"))
	return time.ParseDuration(strings.TrimSpace(line))
}
