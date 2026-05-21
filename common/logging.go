package common

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func InitLogging() {
	env := os.Getenv("APP_ENV")

	if env == "production" {
		// JSON output for production
		zerolog.TimeFieldFormat = time.RFC3339Nano
		log.Logger = zerolog.New(os.Stderr).With().Timestamp().Caller().Logger()
	} else {
		// Pretty console output for development
		log.Logger = zerolog.New(zerolog.ConsoleWriter{
			Out:         os.Stdout,
			TimeFormat:  "15:04:05",
			NoColor:     true,
			FormatLevel: func(i any) string { return "" },
			FormatTimestamp: func(i any) string {
				t, _ := time.Parse(time.RFC3339, fmt.Sprintf("%s", i))
				return fmt.Sprintf("[%s]", t.Format("15:04:05"))
			},
			FormatCaller: func(i any) string { return "" },
		}).With().Timestamp().Logger()
	}

	// Set log level from env, default to info
	level := os.Getenv("LOG_LEVEL")
	if level == "" {
		level = "info"
	}
	if err := SetLogLevel(level); err != nil {
		log.Warn().Err(err).Msg("invalid LOG_LEVEL, defaulting to info")
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	// Make zerolog.Ctx(ctx) return global logger when no logger in context
	zerolog.DefaultContextLogger = &log.Logger
}

// SetLogLevel sets the global log level.
func SetLogLevel(level string) error {
	switch strings.ToLower(level) {
	case "trace":
		zerolog.SetGlobalLevel(zerolog.TraceLevel)
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn", "warning":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	case "fatal":
		zerolog.SetGlobalLevel(zerolog.FatalLevel)
	case "panic":
		zerolog.SetGlobalLevel(zerolog.PanicLevel)
	default:
		return fmt.Errorf("invalid log level: %s", level)
	}
	return nil
}
