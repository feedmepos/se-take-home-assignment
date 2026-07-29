# Vue 订单展示 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Go 订单控制器上增加 HTTP API 与 Vue 3 页面，用短轮询展示 PENDING / PROCESSING / COMPLETE 与 Bot，并通过 `-serve` 同源托管。

**Architecture:** `internal/api` 薄包一层 HTTP，从 `controller.Snapshot()` 派生 `processing`；Vue 3 + Vite 放在 `web/`，生产构建进 `web/dist` 由 Go `embed` 托管；CLI / `-demo` / CI 脚本不变。

**Tech Stack:** Go 1.23+ 标准库（`net/http`、`encoding/json`、`embed`）、Vue 3、Vite、Composition API；无 UI 组件库、无第三方 Go 依赖。

## Global Constraints

- 模块路径：`github.com/Splinglove/se-take-home-assignment`
- 复用 `internal/controller`，不重写调度逻辑
- 短轮询间隔：300ms；`process-time` 仅服务端 flag
- 模式优先级：`-serve` > `-demo` > 交互 CLI
- 不改 `scripts/run.sh` / CI demo 行为；`scripts/test.sh` 须继续通过
- Spec：`docs/superpowers/specs/2026-07-29-vue-order-ui-design.md`
- YAGNI：无 WebSocket、无鉴权、无持久化、无公网部署、无事件日志栏
- Spec 与 Plan 正文用中文；代码标识符与 JSON 字段用英文

## 文件结构

| 路径 | 职责 |
|------|------|
| `internal/api/state.go` | JSON DTO + 从 Snapshot 组装 State（含 processing） |
| `internal/api/state_test.go` | PROCESSING 派生与序列化字段测试 |
| `internal/api/server.go` | HTTP 路由、handler、错误 JSON、静态文件 |
| `internal/api/server_test.go` | API 端点集成单测 |
| `web/embed.go` | `//go:embed all:dist`，导出 `DistFS()` |
| `web/dist/index.html` | 占位页（保证 `go build` 在未跑 npm 时也能 embed） |
| `cmd/order-controller/main.go` | 增加 `-serve`、`-addr` |
| `web/package.json` 等 | Vue 3 + Vite 工程 |
| `web/vite.config.js` | dev proxy `/api` → `:8080` |
| `web/src/App.vue` | 主视图：按钮、三栏、Bot、轮询 |
| `web/src/main.js` | 挂载 |
| `web/src/api.js` | fetch 封装 |
| `README.md` | 补充 Web 启动步骤 |

---

### Task 1: State DTO 与 PROCESSING 派生

**Files:**
- Create: `internal/api/state.go`
- Create: `internal/api/state_test.go`

**Interfaces:**
- Consumes: `controller.Snapshot`, `order.Order`, `bot.Bot`
- Produces:
  - `type OrderDTO struct { ID int \`json:"id"\`; Type string \`json:"type"\`; Status string \`json:"status"\` }`
  - `type BotDTO struct { ID int \`json:"id"\`; Status string \`json:"status"\`; CurrentOrderID *int \`json:"currentOrderId"\` }`
  - `type State struct { Pending []OrderDTO \`json:"pending"\`; Processing []OrderDTO \`json:"processing"\`; Complete []OrderDTO \`json:"complete"\`; Bots []BotDTO \`json:"bots"\` }`
  - `func BuildState(snap controller.Snapshot) State`

- [ ] **Step 1: 写失败的派生测试**

Create `internal/api/state_test.go`:

```go
package api_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/Splinglove/se-take-home-assignment/internal/api"
	"github.com/Splinglove/se-take-home-assignment/internal/bot"
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
	"github.com/Splinglove/se-take-home-assignment/internal/order"
)

func TestBuildState_ProcessingFromBots(t *testing.T) {
	o1 := &order.Order{ID: 1, Type: order.TypeVIP, Status: order.StatusPending}
	o2 := &order.Order{ID: 2, Type: order.TypeNormal, Status: order.StatusProcessing}
	o3 := &order.Order{ID: 3, Type: order.TypeNormal, Status: order.StatusComplete}
	b1 := &bot.Bot{ID: 1, Status: bot.StatusProcessing, CurrentOrder: o2}
	b2 := &bot.Bot{ID: 2, Status: bot.StatusIdle, CurrentOrder: nil}

	st := api.BuildState(controller.Snapshot{
		Pending:  []*order.Order{o1},
		Complete: []*order.Order{o3},
		Bots:     []*bot.Bot{b1, b2},
	})

	if len(st.Pending) != 1 || st.Pending[0].ID != 1 {
		t.Fatalf("pending=%v", st.Pending)
	}
	if len(st.Processing) != 1 || st.Processing[0].ID != 2 || st.Processing[0].Status != "PROCESSING" {
		t.Fatalf("processing=%v", st.Processing)
	}
	if len(st.Complete) != 1 || st.Complete[0].ID != 3 {
		t.Fatalf("complete=%v", st.Complete)
	}
	if len(st.Bots) != 2 {
		t.Fatalf("bots len=%d", len(st.Bots))
	}
	if st.Bots[0].CurrentOrderID == nil || *st.Bots[0].CurrentOrderID != 2 {
		t.Fatalf("bot0 currentOrderId=%v", st.Bots[0].CurrentOrderID)
	}
	if st.Bots[1].CurrentOrderID != nil {
		t.Fatalf("bot1 should be idle, got %v", st.Bots[1].CurrentOrderID)
	}

	raw, err := json.Marshal(st)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]json.RawMessage
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"pending", "processing", "complete", "bots"} {
		if _, ok := m[key]; !ok {
			t.Fatalf("missing json key %q in %s", key, raw)
		}
	}
}

func TestBuildState_EmptySlicesNotNull(t *testing.T) {
	st := api.BuildState(controller.Snapshot{})
	raw, _ := json.Marshal(st)
	s := string(raw)
	for _, bad := range []string{`"pending":null`, `"processing":null`, `"complete":null`, `"bots":null`} {
		if strings.Contains(s, bad) {
			t.Fatalf("null slice in json: %s", s)
		}
	}
}
```

并在该文件 import 中加入 `"strings"`。

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/chenenqi/workself/se-take-home-assignment
go test ./internal/api/ -v
```

Expected: FAIL（`package api` / `BuildState` 未定义）

- [ ] **Step 3: 实现 `BuildState`**

Create `internal/api/state.go`:

```go
package api

import (
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
	"github.com/Splinglove/se-take-home-assignment/internal/order"
)

type OrderDTO struct {
	ID     int    `json:"id"`
	Type   string `json:"type"`
	Status string `json:"status"`
}

type BotDTO struct {
	ID             int    `json:"id"`
	Status         string `json:"status"`
	CurrentOrderID *int   `json:"currentOrderId"`
}

type State struct {
	Pending    []OrderDTO `json:"pending"`
	Processing []OrderDTO `json:"processing"`
	Complete   []OrderDTO `json:"complete"`
	Bots       []BotDTO   `json:"bots"`
}

func BuildState(snap controller.Snapshot) State {
	st := State{
		Pending:    make([]OrderDTO, 0, len(snap.Pending)),
		Processing: make([]OrderDTO, 0),
		Complete:   make([]OrderDTO, 0, len(snap.Complete)),
		Bots:       make([]BotDTO, 0, len(snap.Bots)),
	}
	for _, o := range snap.Pending {
		st.Pending = append(st.Pending, toOrderDTO(o))
	}
	for _, o := range snap.Complete {
		st.Complete = append(st.Complete, toOrderDTO(o))
	}
	for _, b := range snap.Bots {
		bd := BotDTO{ID: b.ID, Status: string(b.Status)}
		if b.CurrentOrder != nil {
			id := b.CurrentOrder.ID
			bd.CurrentOrderID = &id
			if b.CurrentOrder.Status == order.StatusProcessing {
				st.Processing = append(st.Processing, toOrderDTO(b.CurrentOrder))
			}
		}
		st.Bots = append(st.Bots, bd)
	}
	return st
}

func toOrderDTO(o *order.Order) OrderDTO {
	return OrderDTO{ID: o.ID, Type: string(o.Type), Status: string(o.Status)}
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
go test ./internal/api/ -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/api/state.go internal/api/state_test.go
git commit -m "$(cat <<'EOF'
feat(api): add state DTO with processing derived from bots

EOF
)"
```

---

### Task 2: HTTP API Server

**Files:**
- Create: `internal/api/server.go`
- Create: `internal/api/server_test.go`

**Interfaces:**
- Consumes: `*controller.Controller`, `BuildState`
- Produces:
  - `type Server struct { ... }`
  - `func NewServer(ctrl *controller.Controller, static fs.FS) *Server`
  - `func (s *Server) Handler() http.Handler` — 返回挂好路由的 mux
  - 路由：`GET /api/state`、`POST /api/orders/normal`、`POST /api/orders/vip`、`POST /api/bots`、`DELETE /api/bots`；其余静态资源由 `static` 提供（本 Task 可用 `nil`/空 FS 测 API；静态在 Task 3）

- [ ] **Step 1: 写失败的 HTTP 测试**

Create `internal/api/server_test.go`:

```go
package api_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/api"
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
)

func newTestServer(t *testing.T) http.Handler {
	t.Helper()
	ctrl := controller.New(50*time.Millisecond, nil)
	return api.NewServer(ctrl, nil).Handler()
}

func decodeState(t *testing.T, body io.Reader) api.State {
	t.Helper()
	var st api.State
	if err := json.NewDecoder(body).Decode(&st); err != nil {
		t.Fatal(err)
	}
	return st
}

func TestAPI_CreateOrdersAndVIPOrder(t *testing.T) {
	h := newTestServer(t)

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/orders/normal", nil))
	if rr.Code != 200 {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	st := decodeState(t, rr.Body)
	if len(st.Pending) != 1 || st.Pending[0].Type != "NORMAL" {
		t.Fatalf("pending=%v", st.Pending)
	}

	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/orders/vip", nil))
	st = decodeState(t, rr.Body)
	if len(st.Pending) != 2 || st.Pending[0].Type != "VIP" || st.Pending[1].Type != "NORMAL" {
		t.Fatalf("VIP should lead pending: %v", st.Pending)
	}
}

func TestAPI_AddBotPicksUpAndProcessingVisible(t *testing.T) {
	h := newTestServer(t)
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/api/orders/normal", nil))

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/api/bots", nil))
	if rr.Code != 200 {
		t.Fatalf("status=%d", rr.Code)
	}

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		rr = httptest.NewRecorder()
		h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/state", nil))
		st := decodeState(t, rr.Body)
		if len(st.Processing) == 1 {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("expected processing order within timeout")
}

func TestAPI_RemoveBotEmpty404(t *testing.T) {
	h := newTestServer(t)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodDelete, "/api/bots", nil))
	if rr.Code != http.StatusNotFound {
		t.Fatalf("status=%d want 404", rr.Code)
	}
	var errBody map[string]string
	_ = json.NewDecoder(rr.Body).Decode(&errBody)
	if errBody["error"] == "" {
		t.Fatalf("expected error field, got %v", errBody)
	}
}

func TestAPI_RemoveBotOK(t *testing.T) {
	h := newTestServer(t)
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/api/bots", nil))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodDelete, "/api/bots", nil))
	if rr.Code != 200 {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	st := decodeState(t, rr.Body)
	if len(st.Bots) != 0 {
		t.Fatalf("bots=%v", st.Bots)
	}
}
```

- [ ] **Step 2: 运行测试确认失败**

```bash
go test ./internal/api/ -v -run TestAPI_
```

Expected: FAIL（`NewServer` 未定义）

- [ ] **Step 3: 实现 Server**

Create `internal/api/server.go`:

```go
package api

import (
	"encoding/json"
	"io/fs"
	"net/http"

	"github.com/Splinglove/se-take-home-assignment/internal/controller"
)

type Server struct {
	ctrl   *controller.Controller
	static fs.FS
}

func NewServer(ctrl *controller.Controller, static fs.FS) *Server {
	return &Server{ctrl: ctrl, static: static}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/state", s.handleState)
	mux.HandleFunc("POST /api/orders/normal", s.handleNormal)
	mux.HandleFunc("POST /api/orders/vip", s.handleVIP)
	mux.HandleFunc("POST /api/bots", s.handleAddBot)
	mux.HandleFunc("DELETE /api/bots", s.handleRemoveBot)
	if s.static != nil {
		fileServer := http.FileServer(http.FS(s.static))
		mux.Handle("/", fileServer)
	}
	return mux
}

func (s *Server) writeState(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(BuildState(s.ctrl.Snapshot()))
}

func (s *Server) writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func (s *Server) handleState(w http.ResponseWriter, r *http.Request) {
	s.writeState(w)
}

func (s *Server) handleNormal(w http.ResponseWriter, r *http.Request) {
	s.ctrl.CreateNormalOrder()
	s.writeState(w)
}

func (s *Server) handleVIP(w http.ResponseWriter, r *http.Request) {
	s.ctrl.CreateVIPOrder()
	s.writeState(w)
}

func (s *Server) handleAddBot(w http.ResponseWriter, r *http.Request) {
	s.ctrl.AddBot()
	s.writeState(w)
}

func (s *Server) handleRemoveBot(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.ctrl.RemoveBot(); !ok {
		s.writeError(w, http.StatusNotFound, "no bots to remove")
		return
	}
	s.writeState(w)
}
```

说明：Go 1.22+ 的 `ServeMux` 方法路由（`GET /api/state`）可用；本仓库 `go 1.23`。

- [ ] **Step 4: 运行测试确认通过**

```bash
go test ./internal/api/ -v
```

Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add internal/api/server.go internal/api/server_test.go
git commit -m "$(cat <<'EOF'
feat(api): add HTTP handlers for order controller state

EOF
)"
```

---

### Task 3: embed 静态资源 + `-serve` 入口

**Files:**
- Create: `web/embed.go`（`package web`，embed 同目录下 `dist/`；`//go:embed` 禁止 `..`）
- Create: `web/dist/index.html`（占位，保证 embed 目录非空、CI 未跑 npm 时也能 `go build`）
- Modify: `cmd/order-controller/main.go`

**Interfaces:**
- Consumes: `api.NewServer`, `web.DistFS()`
- Produces:
  - `func DistFS() fs.FS`（`web` 包）
  - `main`：`-serve bool`、`-addr string`（默认 `:8080`）；优先级 `-serve` > `-demo` > 交互

- [ ] **Step 1: 创建占位静态页**

Create `web/dist/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Order Controller</title>
  </head>
  <body>
    <p>Frontend not built yet. Run <code>npm run build</code> in <code>web/</code>.</p>
  </body>
</html>
```

- [ ] **Step 2: embed 包**

Create `web/embed.go`:

```go
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
```

`web/` 同时作为 Vite 工程与 Go 包；`package.json` 与 `embed.go` 可共存。勿 embed `node_modules`。

- [ ] **Step 3: 修改 main 增加 -serve**

Modify `cmd/order-controller/main.go` 为：

```go
package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/api"
	"github.com/Splinglove/se-take-home-assignment/internal/cli"
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
	"github.com/Splinglove/se-take-home-assignment/web"
)

func main() {
	demo := flag.Bool("demo", false, "run non-interactive demo")
	serve := flag.Bool("serve", false, "serve HTTP API and web UI")
	addr := flag.String("addr", ":8080", "HTTP listen address (with -serve)")
	processTime := flag.Duration("process-time", 10*time.Second, "order processing duration")
	flag.Parse()

	ctrl := controller.New(*processTime, func(msg string) {
		fmt.Fprintln(os.Stdout, cli.FormatLog(time.Now(), msg))
	})

	if *serve {
		srv := api.NewServer(ctrl, web.DistFS())
		fmt.Fprintf(os.Stdout, "Listening on http://localhost%s\n", *addr)
		if err := http.ListenAndServe(*addr, srv.Handler()); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}

	app := cli.New(ctrl, os.Stdin, os.Stdout)
	if *demo {
		if err := app.RunDemo(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}
	if err := app.RunInteractive(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
```

- [ ] **Step 4: 验证 build 与 serve**

```bash
./scripts/build.sh
./bin/order-controller -serve -process-time=2s &
sleep 1
curl -s http://localhost:8080/api/state
curl -s -X POST http://localhost:8080/api/orders/vip
curl -s http://localhost:8080/ | head
kill %1 2>/dev/null || true
```

Expected: JSON 含 `pending`/`processing`/`complete`/`bots`；HTML 占位页可访问；`go test ./...` PASS。

- [ ] **Step 5: Commit**

```bash
git add web/embed.go web/dist/index.html cmd/order-controller/main.go
git commit -m "$(cat <<'EOF'
feat: add -serve mode with embedded web dist

EOF
)"
```

---

### Task 4: Vue 3 + Vite 脚手架与 API 客户端

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.js`
- Create: `web/index.html`（Vite 入口，源码侧；与 `dist/` 区分）
- Create: `web/src/main.js`
- Create: `web/src/api.js`
- Create: `web/.gitignore`（忽略 `node_modules`）

**Interfaces:**
- Produces（`web/src/api.js`）:
  - `export async function fetchState()`
  - `export async function createNormalOrder()`
  - `export async function createVIPOrder()`
  - `export async function addBot()`
  - `export async function removeBot()` — 失败时 throw Error(message from JSON)

注意：Vite 的 `root` 为 `web/`，`build.outDir` 为 `dist`。`web/index.html` 是开发入口；构建产物写入 `web/dist/`（覆盖占位）。`web/embed.go` 继续 embed `dist`。

- [ ] **Step 1: 写 package.json 与 vite 配置**

`web/package.json`:

```json
{
  "name": "order-controller-ui",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.13"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",
    "vite": "^6.0.7"
  }
}
```

`web/vite.config.js`:

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
```

`web/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>McDonald's Order Controller</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

`web/.gitignore`:

```
node_modules
```

- [ ] **Step 2: API 客户端**

Create `web/src/api.js`:

```js
async function request(url, options = {}) {
  const res = await fetch(url, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || res.statusText || 'request failed')
  }
  return data
}

export function fetchState() {
  return request('/api/state')
}

export function createNormalOrder() {
  return request('/api/orders/normal', { method: 'POST' })
}

export function createVIPOrder() {
  return request('/api/orders/vip', { method: 'POST' })
}

export function addBot() {
  return request('/api/bots', { method: 'POST' })
}

export function removeBot() {
  return request('/api/bots', { method: 'DELETE' })
}
```

- [ ] **Step 3: main.js 占位挂载**

Create `web/src/main.js`:

```js
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

Create 临时 `web/src/App.vue`（下一 Task 会换成完整 UI）：

```vue
<script setup>
const msg = 'Order UI scaffold'
</script>

<template>
  <p>{{ msg }}</p>
</template>
```

- [ ] **Step 4: 安装并构建**

```bash
cd /Users/chenenqi/workself/se-take-home-assignment/web
npm install
npm run build
cd ..
./scripts/build.sh
```

Expected: `web/dist/` 含构建产物；`go build` 成功。

- [ ] **Step 5: Commit**

```bash
git add web/package.json web/package-lock.json web/vite.config.js web/index.html web/src web/.gitignore web/dist web/embed.go
git commit -m "$(cat <<'EOF'
feat(web): scaffold Vue 3 + Vite with API client

EOF
)"
```

（若 `package-lock.json` 过大可提交；`node_modules` 不提交。）

---

### Task 5: 主界面 App.vue（三栏 + Bot + 轮询）

**Files:**
- Modify: `web/src/App.vue`
- Create: `web/src/style.css`（可选，样式可内联在 App.vue）

**Interfaces:**
- Consumes: `web/src/api.js` 全部导出函数
- Produces: 可演示的完整 UI

- [ ] **Step 1: 实现 App.vue**

Replace `web/src/App.vue` with:

```vue
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import {
  addBot,
  createNormalOrder,
  createVIPOrder,
  fetchState,
  removeBot,
} from './api.js'

const pending = ref([])
const processing = ref([])
const complete = ref([])
const bots = ref([])
const error = ref('')
let timer = null

function applyState(st) {
  pending.value = st.pending || []
  processing.value = st.processing || []
  complete.value = st.complete || []
  bots.value = st.bots || []
}

async function refresh() {
  try {
    applyState(await fetchState())
  } catch (e) {
    error.value = e.message || String(e)
  }
}

async function run(action) {
  error.value = ''
  try {
    applyState(await action())
  } catch (e) {
    error.value = e.message || String(e)
  }
}

onMounted(() => {
  refresh()
  timer = setInterval(refresh, 300)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="page">
    <h1>McDonald's Order Controller</h1>

    <div class="actions">
      <button type="button" @click="run(createNormalOrder)">New Normal</button>
      <button type="button" @click="run(createVIPOrder)">New VIP</button>
      <button type="button" @click="run(addBot)">+ Bot</button>
      <button type="button" @click="run(removeBot)">- Bot</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="columns">
      <section>
        <h2>PENDING ({{ pending.length }})</h2>
        <ul>
          <li
            v-for="o in pending"
            :key="'p-' + o.id"
            :class="{ vip: o.type === 'VIP' }"
          >
            #{{ o.id }} {{ o.type }}
          </li>
        </ul>
      </section>
      <section>
        <h2>PROCESSING ({{ processing.length }})</h2>
        <ul>
          <li
            v-for="o in processing"
            :key="'x-' + o.id"
            :class="{ vip: o.type === 'VIP' }"
          >
            #{{ o.id }} {{ o.type }}
          </li>
        </ul>
      </section>
      <section>
        <h2>COMPLETE ({{ complete.length }})</h2>
        <ul>
          <li
            v-for="o in complete"
            :key="'c-' + o.id"
            :class="{ vip: o.type === 'VIP' }"
          >
            #{{ o.id }} {{ o.type }}
          </li>
        </ul>
      </section>
    </div>

    <section class="bots">
      <h2>BOTS ({{ bots.length }})</h2>
      <ul>
        <li v-for="b in bots" :key="b.id">
          Bot #{{ b.id }} {{ b.status }}
          <span v-if="b.currentOrderId != null">→ Order #{{ b.currentOrderId }}</span>
          <span v-else>→ idle</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page {
  font-family: Georgia, 'Times New Roman', serif;
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
  background: linear-gradient(160deg, #fff8f0 0%, #f0f4f8 100%);
  min-height: 100vh;
  box-sizing: border-box;
}
h1 {
  font-size: 1.75rem;
  margin: 0 0 1rem;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
button {
  font: inherit;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  border: 1px solid #333;
  background: #fff;
}
button:hover {
  background: #ffe8cc;
}
.error {
  color: #a40000;
}
.columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
@media (max-width: 700px) {
  .columns {
    grid-template-columns: 1fr;
  }
}
section {
  min-height: 8rem;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
li {
  padding: 0.4rem 0.6rem;
  margin-bottom: 0.35rem;
  background: #fff;
  border-left: 3px solid #666;
}
li.vip {
  border-left-color: #c45c26;
  font-weight: 700;
}
.bots {
  margin-top: 1.5rem;
}
</style>
```

- [ ] **Step 2: 重新构建并手动验证**

```bash
cd /Users/chenenqi/workself/se-take-home-assignment/web && npm run build && cd ..
./scripts/build.sh
./bin/order-controller -serve -process-time=2s
```

在浏览器打开 `http://localhost:8080/`：
1. New Normal → PENDING 出现
2. New VIP → VIP 排在普通前
3. + Bot → 约 2s 后进入 PROCESSING 再 COMPLETE
4. - Bot（无 bot）→ 错误提示
5. 有 bot 时 - Bot → bot 减少；处理中订单回 PENDING

开发模式可选：终端 1 `-serve`，终端 2 `cd web && npm run dev`，打开 `http://localhost:5173/`。

- [ ] **Step 3: 跑全量测试**

```bash
./scripts/test.sh
```

Expected: 全部 PASS（含 `internal/api`）

- [ ] **Step 4: Commit**

```bash
git add web/src/App.vue web/dist
git commit -m "$(cat <<'EOF'
feat(web): order board UI with polling and bot controls

EOF
)"
```

---

### Task 6: README 文档

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 在 README「Backend (Go)」节后追加 Web 用法**

在合适位置追加：

```markdown
### Web UI（Vue）

```bash
cd web && npm install && npm run build && cd ..
./scripts/build.sh
./bin/order-controller -serve -process-time=2s
# 浏览器打开 http://localhost:8080/
```

开发联调：先 `-serve`，再在 `web/` 执行 `npm run dev`（Vite 将 `/api` 代理到 `:8080`）。

命令：页面按钮对应 New Normal / New VIP / + Bot / - Bot；状态每 300ms 刷新。
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: document Vue web UI serve workflow

EOF
)"
```

---

## 自审（对照 Spec）

| Spec 要求 | 对应 Task |
|-----------|-----------|
| 混合架构 / 复用 controller | Task 1–2 |
| 短轮询 300ms | Task 5 |
| Vue 3 + Vite | Task 4–5 |
| Go 托管静态 + `-serve` | Task 3 |
| PENDING/PROCESSING/COMPLETE + Bots | Task 1, 5 |
| API 端点与 404 | Task 2 |
| CLI/CI 不变 | Task 3 不改 run.sh |
| README | Task 6 |
| API 单测 | Task 1–2 |
| embed 前需 dist | Task 3 占位 + Task 4/5 build |

无 TBD/TODO 占位；JSON 字段名与 Spec 一致（`currentOrderId`）。
