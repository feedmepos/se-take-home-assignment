package web

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distFS embed.FS

func DistFS() fs.FS {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		panic(err)
	}
	return sub
}
