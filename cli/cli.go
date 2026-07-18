package cli

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/feedmepos/se-take-home-assignment/controller"
)

// CLI 交互式命令行界面
type CLI struct {
	ctrl       *controller.Controller
	reader     *bufio.Reader
	running    bool
	processDur time.Duration
}

// New 创建一个新的 CLI 实例
func New(processDuration time.Duration) *CLI {
	return &CLI{
		ctrl:       controller.New(processDuration),
		reader:     bufio.NewReader(os.Stdin),
		processDur: processDuration,
	}
}

// Run 启动交互式 CLI 主循环
func (c *CLI) Run() {
	c.printWelcome()
	c.running = true

	for c.running {
		fmt.Print("\n> ")
		line, err := c.reader.ReadString('\n')
		if err != nil {
			fmt.Println("Goodbye!")
			break
		}

		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		c.handleCommand(line)
	}

	c.ctrl.Shutdown()
}

// handleCommand 解析并执行命令
func (c *CLI) handleCommand(line string) {
	parts := strings.Fields(line)
	if len(parts) == 0 {
		return
	}

	cmd := strings.ToLower(parts[0])
	args := parts[1:]

	switch cmd {
	// ---- 帮助 ----
	case "help", "h", "?":
		c.cmdHelp()

	// ---- 订单操作 ----
	case "order", "o":
		c.cmdOrder(args)
	case "normal", "n":
		c.ctrl.CreateNormalOrder()
	case "vip", "v":
		c.ctrl.CreateVIPOrder()

	// ---- Bot 操作 ----
	case "bot", "b":
		c.cmdBot(args)
	case "add", "a":
		c.ctrl.AddBot()
	case "remove", "r", "rm":
		c.cmdRemove()

	// ---- 查看状态 ----
	case "status", "s", "stats":
		c.cmdStatus()

	// ---- 等待（用于观察 Bot 处理） ----
	case "wait", "w":
		c.cmdWait(args)

	// ---- 批量操作 ----
	case "batch":
		c.cmdBatch(args)

	// ---- 退出 ----
	case "exit", "quit", "q":
		c.cmdExit()

	default:
		fmt.Printf("Unknown command: %s (type 'help' for available commands)\n", cmd)
	}
}

// ---- 命令实现 ----

func (c *CLI) cmdHelp() {
	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println("  McDonald's Order Management System - CLI Commands")
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println()
	fmt.Println("  Order Management:")
	fmt.Println("    order normal  |  o n    创建普通订单")
	fmt.Println("    order vip     |  o v    创建 VIP 订单")
	fmt.Println("    normal        |  n      快捷创建普通订单")
	fmt.Println("    vip           |  v      快捷创建 VIP 订单")
	fmt.Println()
	fmt.Println("  Bot Management:")
	fmt.Println("    bot add       |  b a    添加机器人")
	fmt.Println("    bot remove    |  b r    移除最新机器人")
	fmt.Println("    add           |  a      快捷添加机器人")
	fmt.Println("    remove        |  r      快捷移除机器人")
	fmt.Println()
	fmt.Println("  Status & Info:")
	fmt.Println("    status        |  s      查看系统当前状态")
	fmt.Println()
	fmt.Println("  Batch Operations:")
	fmt.Println("    batch orders <n> <type>  批量创建 n 个订单 (normal/vip)")
	fmt.Println("    batch bots <n>           批量添加 n 个机器人")
	fmt.Println()
	fmt.Println("  Other:")
	fmt.Println("    wait <seconds>  |  w <s>  等待指定秒数（观察处理进度）")
	fmt.Println("    help            |  h     显示此帮助信息")
	fmt.Println("    exit            |  q     退出程序")
	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════════")
}

func (c *CLI) cmdOrder(args []string) {
	if len(args) == 0 {
		fmt.Println("Usage: order <normal|vip>  (or: o <n|v>)")
		return
	}
	switch strings.ToLower(args[0]) {
	case "normal", "n":
		c.ctrl.CreateNormalOrder()
	case "vip", "v":
		c.ctrl.CreateVIPOrder()
	default:
		fmt.Printf("Unknown order type: %s (use 'normal' or 'vip')\n", args[0])
	}
}

func (c *CLI) cmdBot(args []string) {
	if len(args) == 0 {
		fmt.Println("Usage: bot <add|remove>  (or: b <a|r>)")
		return
	}
	switch strings.ToLower(args[0]) {
	case "add", "a":
		c.ctrl.AddBot()
	case "remove", "r", "rm":
		c.cmdRemove()
	default:
		fmt.Printf("Unknown bot action: %s (use 'add' or 'remove')\n", args[0])
	}
}

func (c *CLI) cmdRemove() {
	if err := c.ctrl.RemoveBot(); err != nil {
		fmt.Printf("Error: %v\n", err)
	}
}

func (c *CLI) cmdStatus() {
	pendingV, pendingN := c.ctrl.PendingOrdersByType()
	processingV, processingN := c.ctrl.ProcessingOrdersByType()
	completedV, completedN := c.ctrl.CompletedOrdersByType()

	fmt.Println()
	fmt.Println("─────────────────────────────────────────")
	fmt.Printf("  🟢 Bots:       %d\n", c.ctrl.ActiveBots())
	fmt.Printf("  📋 Pending:    %d  (VIP:%d  Normal:%d)\n", pendingV+pendingN, pendingV, pendingN)
	fmt.Printf("  🔄 Processing: %d  (VIP:%d  Normal:%d)\n", processingV+processingN, processingV, processingN)
	fmt.Printf("  ✅ Completed:  %d  (VIP:%d  Normal:%d)\n", completedV+completedN, completedV, completedN)
	fmt.Println("─────────────────────────────────────────")
	fmt.Printf("  Processing time per order: %v\n", c.processDur)
	fmt.Println("─────────────────────────────────────────")
}

func (c *CLI) cmdWait(args []string) {
	seconds := 5 // 默认等待 5 秒
	if len(args) > 0 {
		if n, err := strconv.Atoi(args[0]); err == nil && n > 0 && n <= 60 {
			seconds = n
		} else {
			fmt.Println("Usage: wait <1-60>  (seconds)")
			return
		}
	}

	fmt.Printf("Waiting %d seconds...\n", seconds)
	for i := 1; i <= seconds; i++ {
		time.Sleep(1 * time.Second)

		pendingV, pendingN := c.ctrl.PendingOrdersByType()
		processingV, processingN := c.ctrl.ProcessingOrdersByType()
		completedV, completedN := c.ctrl.CompletedOrdersByType()

		fmt.Printf("  ... %d/%ds | Bots:%d | Pending:%d(V:%d N:%d) Processing:%d(V:%d N:%d) Completed:%d(V:%d N:%d)\n",
			i, seconds, c.ctrl.ActiveBots(),
			pendingV+pendingN, pendingV, pendingN,
			processingV+processingN, processingV, processingN,
			completedV+completedN, completedV, completedN)
	}
}

func (c *CLI) cmdBatch(args []string) {
	if len(args) < 2 {
		fmt.Println("Usage:")
		fmt.Println("  batch orders <count> <normal|vip>")
		fmt.Println("  batch bots <count>")
		return
	}

	switch strings.ToLower(args[0]) {
	case "orders", "order", "o":
		if len(args) < 3 {
			fmt.Println("Usage: batch orders <count> <normal|vip>")
			return
		}
		count, err := strconv.Atoi(args[1])
		if err != nil || count <= 0 || count > 100 {
			fmt.Println("Count must be between 1 and 100")
			return
		}
		orderType := strings.ToLower(args[2])
		if orderType != "normal" && orderType != "n" && orderType != "vip" && orderType != "v" {
			fmt.Println("Type must be 'normal' or 'vip'")
			return
		}

		isVIP := orderType == "vip" || orderType == "v"
		for i := 0; i < count; i++ {
			if isVIP {
				c.ctrl.CreateVIPOrder()
			} else {
				c.ctrl.CreateNormalOrder()
			}
		}
		fmt.Printf("✓ Created %d %s orders\n", count, map[bool]string{true: "VIP", false: "Normal"}[isVIP])

	case "bots", "bot", "b":
		count, err := strconv.Atoi(args[1])
		if err != nil || count <= 0 || count > 100 {
			fmt.Println("Count must be between 1 and 100")
			return
		}
		for i := 0; i < count; i++ {
			c.ctrl.AddBot()
		}
		fmt.Printf("✓ Added %d bots\n", count)

	default:
		fmt.Printf("Unknown batch target: %s (use 'orders' or 'bots')\n", args[0])
	}
}

func (c *CLI) cmdExit() {
	fmt.Println("Shutting down...")
	c.running = false
}

func (c *CLI) printWelcome() {
	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════╗")
	fmt.Println("║  🍔 McDonald's Order Management System 🍟  ║")
	fmt.Println("║        Interactive CLI Mode                  ║")
	fmt.Println("╚══════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Printf("Order processing time: %v\n", c.processDur)
	fmt.Println("Type 'help' for available commands, 'exit' to quit.")
}
