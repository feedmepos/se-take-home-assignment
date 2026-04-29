package mcd

import (
	"fmt"
	"io"
)

// Logf writes a timestamped log message
func Logf(clock Clock, out io.Writer, format string, args ...interface{}) {
	timestamp := clock.Now().Format("15:04:05")
	fmt.Fprintf(out, "[%s] %s\n", timestamp, fmt.Sprintf(format, args...))
}
