package cli

import (
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// 缓存 simulate 输出，避免多次运行（模拟模式约 35 秒）
var (
	simulateOnce  sync.Once
	simulateOutput string
	simulateErr   error
)

func runSimulate(t *testing.T) string {
	t.Helper()
	simulateOnce.Do(func() {
		cmd := exec.Command("go", "run", ".", "simulate")
		cmd.Dir = srcDir(t)
		out, err := cmd.CombinedOutput()
		simulateOutput = string(out)
		simulateErr = err
	})
	require.NoError(t, simulateErr, "simulate 命令应成功执行")
	return simulateOutput
}

func srcDir(t *testing.T) string {
	t.Helper()
	dir := filepath.Join("..", "..", "src")
	abs, err := filepath.Abs(dir)
	require.NoError(t, err)
	return abs
}

func TestSimulate_OutputNotEmpty(t *testing.T) {
	out := runSimulate(t)
	require.NotEmpty(t, out, "输出不应为空")
}

func TestSimulate_TimestampFormat(t *testing.T) {
	out := runSimulate(t)

	tsPattern := regexp.MustCompile(`^\[\d{2}:\d{2}:\d{2}\]`)
	lines := strings.Split(out, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "McDonald") || strings.HasPrefix(line, "Final") || strings.HasPrefix(line, "-") {
			continue
		}
		assert.True(t, tsPattern.MatchString(line),
			"事件行应以 [HH:MM:SS] 开头，实际: %s", line)
	}
}

func TestSimulate_VIPProcessedFirst(t *testing.T) {
	out := runSimulate(t)

	vipIdx := strings.Index(out, "picked up VIP")
	normalIdx := strings.Index(out, "picked up Normal")

	require.NotEqual(t, -1, vipIdx, "应包含 VIP 订单处理")
	require.NotEqual(t, -1, normalIdx, "应包含普通订单处理")
	assert.Less(t, vipIdx, normalIdx, "VIP 订单应先于普通订单被处理")
}

func TestSimulate_ContainsExpectedEvents(t *testing.T) {
	out := runSimulate(t)

	assert.Contains(t, out, "Created Normal Order", "应包含普通订单创建事件")
	assert.Contains(t, out, "Created VIP Order", "应包含 VIP 订单创建事件")
	assert.Contains(t, out, "Bot #1 created", "应包含 Bot #1 创建事件")
	assert.Contains(t, out, "Bot #2 created", "应包含 Bot #2 创建事件")
	assert.Contains(t, out, "completed", "应包含订单完成事件")
	assert.Contains(t, out, "destroyed", "应包含 Bot 销毁事件")
}

func TestSimulate_FinalStatus(t *testing.T) {
	out := runSimulate(t)

	assert.Contains(t, out, "Total Orders Processed:", "应包含总订单数")
	assert.Contains(t, out, "Orders Completed:", "应包含完成订单数")
	assert.Contains(t, out, "Active Bots:", "应包含活跃 Bot 数")
	assert.Contains(t, out, "Pending Orders: 0", "最终不应有待处理订单")
}
