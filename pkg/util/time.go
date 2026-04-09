package util

import "time"

func FormatTimestamp() string {
	return time.Now().Format("15:04:05")
}
