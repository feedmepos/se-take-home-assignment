package main

import (
	"flag"
	"io/fs"
	"log"
	"net/http"

	"github.com/feedme/se-take-home-assignment/internal/api"
	"github.com/feedme/se-take-home-assignment/internal/pack"
	"github.com/feedme/se-take-home-assignment/internal/repository/memory"
	"github.com/feedme/se-take-home-assignment/internal/service"
)

func main() {
	addr := flag.String("addr", ":8080", "监听地址")
	flag.Parse()

	mem := memory.NewMemory()
	k := service.NewKitchen(mem, nil)
	mux := http.NewServeMux()
	(&api.Server{Kitchen: k}).Register(mux)

	sub, err := fs.Sub(pack.Web, "webdist")
	if err != nil {
		log.Fatal(err)
	}
	mux.Handle("/", http.FileServer(http.FS(sub)))

	log.Printf("listening %s", *addr)
	log.Fatal(http.ListenAndServe(*addr, api.WithCORS(mux)))
}
