package utils

import (
	"os"
	"sync"
)

type FileOutputWriter struct {
	file *os.File
	mu   sync.Mutex
}

func NewFileOutputWriter(filename string) (*FileOutputWriter, error) {
	file, err := os.Create(filename)
	if err != nil {
		return nil, err
	}

	return &FileOutputWriter{
		file: file,
	}, nil
}

func (w *FileOutputWriter) WriteLine(line string) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	_, err := os.Stdout.WriteString(line + "\n")
	if err != nil {
		return err
	}

	_, err = w.file.WriteString(line + "\n")
	if err != nil {
		return err
	}

	return w.file.Sync()
}

func (w *FileOutputWriter) Flush() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	return w.file.Close()
}

// ConsoleOutputWriter writes output only to the console (stdout)
type ConsoleOutputWriter struct {
	mu sync.Mutex
}

func NewConsoleOutputWriter() *ConsoleOutputWriter {
	return &ConsoleOutputWriter{}
}

func (w *ConsoleOutputWriter) WriteLine(line string) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	_, err := os.Stdout.WriteString(line + "\n")
	return err
}

func (w *ConsoleOutputWriter) Flush() error {
	return nil
}
