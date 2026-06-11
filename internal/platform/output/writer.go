package output

import (
	"encoding/json"
	"fmt"
	"io"
)

func WriteRaw(w io.Writer, data []byte)  { w.Write(data) }
func WriteJSON(w io.Writer, v any)       { json.NewEncoder(w).SetEscapeHTML(false).Encode(v) }
func WriteError(w io.Writer, msg string) { fmt.Fprintln(w, msg) }
