package cli

import (
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInteractive_CommandSequence(t *testing.T) {
	commands := []string{
		"new normal",
		"new vip",
		"add bot",
		"status",
		"list",
		"exit",
	}

	cmd := exec.Command("go", "run", ".", "interactive")
	cmd.Dir = filepath.Join("..", "..", "src")
	cmd.Stdin = strings.NewReader(strings.Join(commands, "\n") + "\n")
	output, err := cmd.CombinedOutput()
	require.NoError(t, err, "interactive 命令应成功执行")

	out := string(output)

	// 验证基本响应
	assert.Contains(t, out, "#1000", "应包含订单 #1000")
	assert.Contains(t, out, "#1001", "应包含订单 #1001")
	assert.Contains(t, out, "Bot #1", "应包含 Bot #1")
}

func TestInteractive_HelpCommand(t *testing.T) {
	commands := []string{
		"help",
		"exit",
	}

	cmd := exec.Command("go", "run", ".", "interactive")
	cmd.Dir = filepath.Join("..", "..", "src")
	cmd.Stdin = strings.NewReader(strings.Join(commands, "\n") + "\n")
	output, err := cmd.CombinedOutput()
	require.NoError(t, err)

	out := string(output)
	assert.Contains(t, out, "new normal", "帮助信息应包含命令说明")
	assert.Contains(t, out, "add bot", "帮助信息应包含 add bot 命令")
}

func TestInteractive_StatusCommand(t *testing.T) {
	commands := []string{
		"new normal",
		"new vip",
		"status",
		"exit",
	}

	cmd := exec.Command("go", "run", ".", "interactive")
	cmd.Dir = filepath.Join("..", "..", "src")
	cmd.Stdin = strings.NewReader(strings.Join(commands, "\n") + "\n")
	output, err := cmd.CombinedOutput()
	require.NoError(t, err)

	out := string(output)
	// 状态输出应包含订单计数
	assert.Contains(t, out, "2", "状态应显示 2 个订单")
}

func TestInteractive_RemoveBotError(t *testing.T) {
	commands := []string{
		"remove bot",
		"exit",
	}

	cmd := exec.Command("go", "run", ".", "interactive")
	cmd.Dir = filepath.Join("..", "..", "src")
	cmd.Stdin = strings.NewReader(strings.Join(commands, "\n") + "\n")
	output, err := cmd.CombinedOutput()
	require.NoError(t, err)

	out := string(output)
	assert.Contains(t, out, "no bots", "无 Bot 时移除应报错")
}
