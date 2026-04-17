package output

import (
	"fmt"
	"io"
	"time"
)

type Writer struct {
	target io.Writer
}

func NewWriter(target io.Writer) *Writer {
	return &Writer{target: target}
}

func (w *Writer) Line(at time.Time, message string) error {
	_, err := fmt.Fprintf(w.target, "[%s] %s\n", at.Format("15:04:05"), message)
	return err
}

func (w *Writer) Raw() io.Writer {
	return w.target
}

func (w *Writer) RawLine(message string) error {
	_, err := fmt.Fprintln(w.target, message)
	return err
}
