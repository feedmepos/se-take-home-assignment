package utils

import (
	"log/slog"
	"os"
)

var Logger *slog.Logger

func init() {
	// Initialize with a default text handler to stderr
	Logger = slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
}

func InitLogger(level slog.Level, jsonOutput bool) {
	opts := &slog.HandlerOptions{
		Level: level,
	}

	var handler slog.Handler
	if jsonOutput {
		handler = slog.NewJSONHandler(os.Stderr, opts)
	} else {
		handler = slog.NewTextHandler(os.Stderr, opts)
	}

	Logger = slog.New(handler)
}

func Debug(msg string, args ...any) {
	Logger.Debug(msg, args...)
}

func Info(msg string, args ...any) {
	Logger.Info(msg, args...)
}

func Warn(msg string, args ...any) {
	Logger.Warn(msg, args...)
}

func Error(msg string, args ...any) {
	Logger.Error(msg, args...)
}
