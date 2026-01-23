package testutil

import (
	"bytes"
	"io"
	"os"
)

func CaptureOutput() func() string {
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	return func() string {
		w.Close()
		os.Stdout = old
		var buf bytes.Buffer
		io.Copy(&buf, r)
		return buf.String()
	}
}

func Contains(s, substr string) bool {
	return bytes.Contains([]byte(s), []byte(substr))
}
