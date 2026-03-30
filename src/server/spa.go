package server

import (
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// getFrontendFS 尝试获取前端文件系统
// 先检查 embed（prod 模式），再检查本地文件（dev 模式）
func getFrontendFS() fs.FS {
	// 方式1: 从 embed_prod.go 注入的 embedFS
	if embedFS != nil {
		return embedFS
	}

	// 方式2: 本地 webui/dist 目录（开发模式）
	exePath, _ := os.Executable()
	candidates := []string{
		filepath.Join(filepath.Dir(exePath), "..", "webui", "dist"),
		"webui/dist",
		"../webui/dist",
	}
	for _, dir := range candidates {
		if _, err := os.Stat(filepath.Join(dir, "index.html")); err == nil {
			sub, _ := fs.Sub(os.DirFS(filepath.Dir(dir)), filepath.Base(dir))
			return sub
		}
	}

	return nil
}

// serveSPA 提供前端静态文件服务
func serveSPA(w http.ResponseWriter, r *http.Request) {
	fsys := getFrontendFS()
	if fsys == nil {
		http.Error(w, "Frontend not built. Run 'make build-frontend' first.", http.StatusNotFound)
		return
	}

	path := r.URL.Path
	if path == "/" {
		path = "/index.html"
	}

	cleanPath := strings.TrimPrefix(path, "/")

	// 尝试读取文件
	f, err := fsys.Open(cleanPath)
	if err == nil {
		f.Close()
		http.FileServer(http.FS(fsys)).ServeHTTP(w, r)
		return
	}

	// Vue Router 回退
	data, err := fs.ReadFile(fsys, "index.html")
	if err != nil {
		http.Error(w, "Frontend index.html not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(data)
}
