// Package config loads runtime configuration for the order controller.
//
// Precedence (highest to lowest):
//  1. Real process environment variables
//  2. Values from a ".env" file in the working directory, if present
//  3. Built-in defaults
package config

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"
)

// envProcessingTimeKey is the environment/​.env key used to override the
// default order-processing duration.
const envProcessingTimeKey = "FEEDME_PROCESSING_TIME"

// defaultProcessingTime is used when neither a real environment variable
// nor a .env entry supplies FEEDME_PROCESSING_TIME.
const defaultProcessingTime = 10 * time.Second

// Config holds runtime configuration for the order controller.
type Config struct {
	// ProcessingTime is how long a bot takes to process a single order.
	ProcessingTime time.Duration
}

// Load builds a Config using, in order of precedence: real environment
// variables, then a ".env" file in the current working directory (if one
// exists), then built-in defaults.
//
// It never panics: a malformed FEEDME_PROCESSING_TIME value (from either
// source) results in a descriptive error instead.
func Load() (Config, error) {
	cfg := Config{ProcessingTime: defaultProcessingTime}

	// Start with .env values as a fallback layer.
	envFile, err := LoadEnvFile(".env")
	if err != nil {
		return Config{}, err
	}

	if v, ok := envFile[envProcessingTimeKey]; ok {
		d, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("config: invalid %s %q in .env: %w", envProcessingTimeKey, v, err)
		}
		cfg.ProcessingTime = d
	}

	// Real environment variables win over .env and defaults.
	if v, ok := os.LookupEnv(envProcessingTimeKey); ok {
		d, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("config: invalid %s %q in environment: %w", envProcessingTimeKey, v, err)
		}
		cfg.ProcessingTime = d
	}

	return cfg, nil
}

// LoadEnvFile parses a simple ".env"-style file at path into a map of
// key/value pairs. It:
//   - returns an empty map (no error) if the file does not exist
//   - skips blank lines and lines beginning with '#' (after trimming space)
//   - splits each remaining line on the first '=' into key/value
//   - trims surrounding whitespace from both key and value
//   - trims a single matching pair of surrounding quotes ( ' or " ) from the value
func LoadEnvFile(path string) (map[string]string, error) {
	result := make(map[string]string)

	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return result, nil
		}
		return nil, fmt.Errorf("config: reading %s: %w", path, err)
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		value = unquote(value)

		if key == "" {
			continue
		}
		result[key] = value
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("config: scanning %s: %w", path, err)
	}

	return result, nil
}

// unquote strips a single matching pair of surrounding single or double
// quotes from s, if present.
func unquote(s string) string {
	if len(s) >= 2 {
		first, last := s[0], s[len(s)-1]
		if (first == '"' && last == '"') || (first == '\'' && last == '\'') {
			return s[1 : len(s)-1]
		}
	}
	return s
}
