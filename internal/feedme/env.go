package feedme

import (
	"os"
	"strconv"
	"time"
)

// ProcessDurationFromEnv 从环境变量解析处理时长：FEEDME_PROCESS_MS（毫秒），无效则返回 defaultDur。
func ProcessDurationFromEnv(defaultDur time.Duration) time.Duration {
	s := os.Getenv("FEEDME_PROCESS_MS")
	if s == "" {
		return defaultDur
	}
	ms, err := strconv.Atoi(s)
	if err != nil || ms <= 0 {
		return defaultDur
	}
	return time.Duration(ms) * time.Millisecond
}

// DemoFastEnabled 为 true 时表示 FEEDME_DEMO_FAST 已设置（非空），用于缩短演示耗时。
func DemoFastEnabled() bool {
	return os.Getenv("FEEDME_DEMO_FAST") != ""
}
