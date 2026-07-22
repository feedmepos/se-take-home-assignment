// Package main 实现 order-cli：一个向 order-server 发请求的轻量命令行工具。
// 用法：order-cli '{"action":"add","object":"orders","type":"vip"}'
// 支持的 action：add/remove/finalize/status。
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// command 是 CLI 输入的解析结果。JSON tag 对应输入 JSON 字段。
// 也支持简化的非 JSON 语法（见 parseCommand）。
type command struct {
	Action string `json:"action"`
	Object string `json:"object"`
	Type   string `json:"type"`
}

func main() {
	addr := flag.String("addr", "127.0.0.1:18080", "server base URL")
	flag.Parse()
	if flag.NArg() != 1 {
		fmt.Fprintln(os.Stderr, `usage: order-cli [-addr http://127.0.0.1:18080] '{"action":"add","object":"orders","type":"vip"}'`)
		os.Exit(1)
	}

	cmd, err := parseCommand(flag.Arg(0))
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid command JSON: %v\n", err)
		os.Exit(1)
	}

	client := &http.Client{Timeout: 5 * time.Second}
	cli := &orderCLI{baseURL: normalizeBaseURL(*addr), client: client}
	if err := cli.execute(cmd); err != nil {
		fmt.Fprintf(os.Stderr, "cli command failed: %v\n", err)
		os.Exit(1)
	}
}

type orderCLI struct {
	baseURL string
	client  *http.Client
}

func (c *orderCLI) execute(cmd command) error {
	switch strings.ToLower(cmd.Action) {
	case "add":
		return c.add(cmd)
	case "remove", "delete":
		return c.remove(cmd)
	case "finalize":
		return c.post("/finalize")
	case "status":
		return c.get("/status")
	default:
		return fmt.Errorf("unsupported action %q", cmd.Action)
	}
}

func (c *orderCLI) add(cmd command) error {
	switch strings.ToLower(cmd.Object) {
	case "orders":
		orderType := strings.ToLower(cmd.Type)
		if orderType == "" {
			orderType = "normal"
		}
		if orderType != "normal" && orderType != "vip" {
			return fmt.Errorf("unsupported order type %q", cmd.Type)
		}
		return c.post("/orders?type=" + orderType)
	case "bots":
		return c.post("/bots")
	default:
		return fmt.Errorf("unsupported add object %q", cmd.Object)
	}
}

func (c *orderCLI) remove(cmd command) error {
	if strings.ToLower(cmd.Object) != "bots" {
		return fmt.Errorf("unsupported remove object %q", cmd.Object)
	}
	return c.delete("/bots")
}

func (c *orderCLI) post(path string) error {
	req, err := http.NewRequest(http.MethodPost, c.baseURL+path, nil)
	if err != nil {
		return err
	}
	return c.do(req)
}

func (c *orderCLI) delete(path string) error {
	req, err := http.NewRequest(http.MethodDelete, c.baseURL+path, nil)
	if err != nil {
		return err
	}
	return c.do(req)
}

func (c *orderCLI) get(path string) error {
	req, err := http.NewRequest(http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return err
	}
	return c.do(req)
}

func (c *orderCLI) do(req *http.Request) error {
	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("%s %s failed: %s: %s", req.Method, req.URL.Path, resp.Status, string(body))
	}
	return nil
}

func normalizeBaseURL(addr string) string {
	addr = strings.TrimSpace(addr)
	if addr == "" {
		addr = "127.0.0.1:18080"
	}
	if !strings.HasPrefix(addr, "http://") && !strings.HasPrefix(addr, "https://") {
		addr = "http://" + addr
	}
	return strings.TrimRight(addr, "/")
}

// parseCommand 接受两种输入：标准 JSON 或简化的花括号语法（如 {action:add,object:orders}）。
// 后者是为了让 shell 里输入更省事——不用引号转义。先试 JSON，失败再降级解析。
func parseCommand(input string) (command, error) {
	var cmd command
	if err := json.Unmarshal([]byte(input), &cmd); err == nil {
		return cmd, nil
	}

	trimmed := strings.TrimSpace(input)
	trimmed = strings.TrimPrefix(trimmed, "{")
	trimmed = strings.TrimSuffix(trimmed, "}")
	for _, part := range strings.Split(trimmed, ",") {
		key, value, ok := strings.Cut(part, ":")
		if !ok {
			return command{}, fmt.Errorf("invalid command %q", input)
		}
		key = cleanToken(key)
		value = cleanToken(value)
		switch key {
		case "action":
			cmd.Action = value
		case "object":
			cmd.Object = value
		case "type":
			cmd.Type = value
		}
	}
	if cmd.Action == "" {
		return command{}, fmt.Errorf("missing action")
	}
	return cmd, nil
}

func cleanToken(value string) string {
	value = strings.TrimSpace(value)
	value = strings.Trim(value, "'\"")
	return strings.TrimSpace(value)
}
