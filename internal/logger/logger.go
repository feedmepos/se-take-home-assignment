package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// Logger defines the interface for logging operations
// Following Interface Segregation Principle: focused interface for logging
type Logger interface {
	// Info logs an informational message
	Info(format string, args ...interface{})

	// Error logs an error message
	Error(format string, args ...interface{})

	// Debug logs a debug message
	Debug(format string, args ...interface{})

	// Close closes the logger and its underlying file
	Close() error
}

// FileLogger implements daily rotating file logger
// Following Single Responsibility Principle: only manages logging to file
// Format: [dd/mm/yyyy - HH:MM:SS] <log message>
type FileLogger struct {
	directory   string
	file        *os.File
	logger      *log.Logger
	currentDate string
	mu          sync.Mutex
}

// NewFileLogger creates a new file logger with daily rotation
// Time Complexity: O(1)
func NewFileLogger(directory string) (*FileLogger, error) {
	// Create directory if it doesn't exist
	if err := os.MkdirAll(directory, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}

	fl := &FileLogger{
		directory: directory,
	}

	// Initialize with current date
	if err := fl.rotate(); err != nil {
		return nil, err
	}

	return fl, nil
}

// rotate rotates the log file to a new date
// Time Complexity: O(1)
func (fl *FileLogger) rotate() error {
	currentDate := time.Now().Format("02-01-2006") // dd-mm-yyyy format

	// Check if rotation is needed
	if fl.currentDate == currentDate {
		return nil
	}

	// Close existing file if open
	if fl.file != nil {
		if err := fl.file.Close(); err != nil {
			return fmt.Errorf("failed to close existing log file: %w", err)
		}
	}

	// Create new log file
	filename := fmt.Sprintf("orders-%s.log", currentDate)
	filepath := filepath.Join(fl.directory, filename)

	file, err := os.OpenFile(filepath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	fl.file = file
	fl.currentDate = currentDate

	// Create multi-writer to write to both file and stdout
	multiWriter := io.MultiWriter(os.Stdout, file)
	fl.logger = log.New(multiWriter, "", 0) // No prefix, we'll add our own format

	return nil
}

// Info logs an informational message
// Time Complexity: O(1)
func (fl *FileLogger) Info(format string, args ...interface{}) {
	fl.log("INFO", format, args...)
}

// Error logs an error message
// Time Complexity: O(1)
func (fl *FileLogger) Error(format string, args ...interface{}) {
	fl.log("ERROR", format, args...)
}

// Debug logs a debug message
// Time Complexity: O(1)
func (fl *FileLogger) Debug(format string, args ...interface{}) {
	fl.log("DEBUG", format, args...)
}

// log is the internal logging method that handles rotation and formatting
// Format: [dd/mm/yyyy - HH:MM:SS] <log message>
// Time Complexity: O(1)
func (fl *FileLogger) log(level, format string, args ...interface{}) {
	fl.mu.Lock()
	defer fl.mu.Unlock()

	// Check if rotation is needed (daily rotation)
	if err := fl.rotate(); err != nil {
		log.Printf("Failed to rotate log file: %v", err)
		return
	}

	// Format timestamp: [dd/mm/yyyy - HH:MM:SS]
	timestamp := time.Now().Format("[02/01/2006 - 15:04:05]")

	// Format message
	message := fmt.Sprintf(format, args...)

	// Log with format: [dd/mm/yyyy - HH:MM:SS] [LEVEL] message
	fl.logger.Printf("%s [%s] %s", timestamp, level, message)
}

// Close closes the logger and its underlying file
// Time Complexity: O(1)
func (fl *FileLogger) Close() error {
	fl.mu.Lock()
	defer fl.mu.Unlock()

	if fl.file != nil {
		if err := fl.file.Close(); err != nil {
			return fmt.Errorf("failed to close log file: %w", err)
		}
		fl.file = nil
	}

	return nil
}

// NoOpLogger is a logger that does nothing (useful for testing)
type NoOpLogger struct{}

// NewNoOpLogger creates a new no-op logger
func NewNoOpLogger() *NoOpLogger {
	return &NoOpLogger{}
}

func (l *NoOpLogger) Info(format string, args ...interface{})  {}
func (l *NoOpLogger) Error(format string, args ...interface{}) {}
func (l *NoOpLogger) Debug(format string, args ...interface{}) {}
func (l *NoOpLogger) Close() error                             { return nil }
