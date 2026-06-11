package output

import (
	"encoding/json"
	"fmt"
	"io"
)

func WriteRaw(w io.Writer, data []byte) { w.Write(data) }

func WriteJSON(w io.Writer, v any) {
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	enc.Encode(v)
}

func WriteError(w io.Writer, msg string) { fmt.Fprintln(w, msg) }
