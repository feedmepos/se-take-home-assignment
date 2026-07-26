package pkg

import (
	"fmt"
	"os"
	"sync"
)

type FileWriter struct {
	file *os.File
	mu   sync.Mutex
}

func NewFileWriter(path string) (*FileWriter, error) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	return &FileWriter{file: f}, nil
}

func (w *FileWriter) Write(line string) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	fmt.Println(line)
	_, err := fmt.Fprintln(w.file, line)
	return err
}

func (w *FileWriter) Close() error {
	return w.file.Close()
}
