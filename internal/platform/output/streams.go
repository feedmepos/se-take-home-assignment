package output

import "io"

type Streams struct {
	Stdout io.Writer
	Stderr io.Writer
}

func DefaultStreams() Streams {
	return Streams{Stdout: io.Discard, Stderr: io.Discard}
}
