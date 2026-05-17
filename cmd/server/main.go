package main

import (
	"flag"
	"io/fs"
	"log"
	"net/http"
	"strings"

	"github.com/feedme/se-take-home-assignment/internal/api"
	"github.com/feedme/se-take-home-assignment/internal/pack"
	"github.com/feedme/se-take-home-assignment/internal/repository/memory"
	"github.com/feedme/se-take-home-assignment/internal/service"
)

// rewriteRedirectLocation 修正子路径下 FileServer 把 Location 写成 "/" 导致浏览器跳到站点根的问题。
func rewriteRedirectLocation(baseNoSlash string, h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.ServeHTTP(&redirectPrefixRW{ResponseWriter: w, base: baseNoSlash}, r)
	})
}

type redirectPrefixRW struct {
	http.ResponseWriter
	base string
	done bool
}

func (w *redirectPrefixRW) WriteHeader(code int) {
	if !w.done {
		w.done = true
		loc := w.Header().Get("Location")
		if loc != "" && strings.HasPrefix(loc, "/") && !strings.HasPrefix(loc, w.base+"/") && loc != w.base {
			w.Header().Set("Location", w.base+loc)
		}
	}
	w.ResponseWriter.WriteHeader(code)
}

func (w *redirectPrefixRW) Flush() {
	if f, ok := w.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func main() {
	addr := flag.String("addr", ":8080", "监听地址")
	basePath := flag.String("base", "", "挂载在子路径时设置，例如 /feedme（与 Nginx location /feedme/ 及前端 VITE_BASE_PATH 一致）")
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

	var handler http.Handler = mux
	bp := strings.TrimSpace(*basePath)
	if bp != "" {
		if !strings.HasPrefix(bp, "/") {
			log.Fatal("-base must start with /, e.g. /feedme")
		}
		bp = strings.TrimSuffix(bp, "/")
		prefix := bp + "/"
		// 必须用 StripPrefix(bp, …) 而不是 bp+"/"：否则去掉前缀后路径缺少前导 "/"，ServeMux 无法匹配 /api/…
		strip := rewriteRedirectLocation(bp, http.StripPrefix(bp, mux))
		root := http.NewServeMux()
		root.HandleFunc(bp, func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == bp {
				http.Redirect(w, r, prefix, http.StatusFound)
				return
			}
			http.NotFound(w, r)
		})
		root.Handle(prefix, strip)
		handler = root
		log.Printf("app mounted under %s (Nginx 将完整 URI 反代到本端口)", prefix)
	}

	log.Printf("listening %s", *addr)
	log.Fatal(http.ListenAndServe(*addr, api.WithCORS(handler)))
}
