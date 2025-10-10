package logging

import (
    "fmt"
    "io"
    "os"
    "sync"
    "time"
)

// Logger 定义统一的日志接口，便于写入 stdout 与 result.txt。
type Logger interface {
    // Infof 写入信息日志。
    Infof(format string, args ...any)
    // Errorf 写入错误日志。
    Errorf(format string, args ...any)
    // WithTS 以统一的 HH:MM:SS 时间戳前缀写日志。
    WithTS(t time.Time, format string, args ...any)
    // Close 关闭底层资源（文件句柄等）。
    Close() error
}

// fileLogger 是最小可用实现：写文件和 stdout，线程安全。
type fileLogger struct {
    mu   sync.Mutex
    out  io.Writer
    file *os.File
}

// NewFileLogger 创建一个同时写文件（result.txt）与 stdout 的 logger。
func NewFileLogger(filepath string) (Logger, error) {
    if err := os.MkdirAll("scripts", 0o755); err != nil {
        return nil, err
    }
    f, err := os.Create(filepath)
    if err != nil {
        return nil, err
    }
    // 同时写入文件与 stdout
    return &fileLogger{out: io.MultiWriter(os.Stdout, f), file: f}, nil
}

// Infof 写信息日志（附加换行）。
func (l *fileLogger) Infof(format string, args ...any) {
    l.mu.Lock()
    defer l.mu.Unlock()
    fmt.Fprintf(l.out, format+"\n", args...)
}

// Errorf 写错误日志（附加换行）。
func (l *fileLogger) Errorf(format string, args ...any) {
    l.mu.Lock()
    defer l.mu.Unlock()
    fmt.Fprintf(l.out, format+"\n", args...)
}

// WithTS 以 HH:MM:SS 时间戳前缀写日志（附加换行）。
func (l *fileLogger) WithTS(t time.Time, format string, args ...any) {
    l.mu.Lock()
    defer l.mu.Unlock()
    ts := t.Format("15:04:05")
    fmt.Fprintf(l.out, "%s "+format+"\n", append([]any{ts}, args...)...)
}

// Close 关闭文件句柄。
func (l *fileLogger) Close() error {
    l.mu.Lock()
    defer l.mu.Unlock()
    if l.file != nil {
        err := l.file.Close()
        l.file = nil
        return err
    }
    return nil
}
