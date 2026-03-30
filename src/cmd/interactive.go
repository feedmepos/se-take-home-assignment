package cmd

import (
	"bufio"
	"fmt"
	"ordercontroller/controller"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

var interactiveCmd = &cobra.Command{
	Use:   "interactive",
	Short: "交互式命令行模式",
	Long:  "启动 REPL 交互模式，支持实时操作订单和 Bot",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runInteractive()
	},
}

func init() {
	rootCmd.AddCommand(interactiveCmd)
}

func runInteractive() error {
	clk := controller.RealClock{}

	ctrl := controller.NewController(func(e controller.Event) {
		fmt.Println(controller.FormatEvent(e))
	}, clk)

	fmt.Println("=== McDonald's 订单控制系统 - 交互模式 ===")
	fmt.Println()
	fmt.Println("命令列表:")
	fmt.Println("  new normal  - 创建普通订单")
	fmt.Println("  new vip     - 创建 VIP 订单")
	fmt.Println("  add bot     - 添加 Bot")
	fmt.Println("  remove bot  - 移除最新 Bot")
	fmt.Println("  list        - 显示所有订单")
	fmt.Println("  status      - 显示系统状态")
	fmt.Println("  help        - 显示帮助")
	fmt.Println("  exit        - 退出")
	fmt.Println()

	scanner := bufio.NewScanner(os.Stdin)
	fmt.Print("> ")

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			fmt.Print("> ")
			continue
		}

		parts := strings.Fields(line)
		cmd := strings.ToLower(parts[0])

		switch {
		case cmd == "exit" || cmd == "quit":
			fmt.Println("再见！")
			return nil

		case cmd == "new" && len(parts) >= 2:
			switch strings.ToLower(parts[1]) {
			case "normal", "n":
				ctrl.NewOrder(controller.OrderNormal)
			case "vip", "v":
				ctrl.NewOrder(controller.OrderVIP)
			default:
				fmt.Println("未知订单类型，请使用: normal 或 vip")
			}

		case cmd == "add" && len(parts) >= 2 && strings.ToLower(parts[1]) == "bot":
			ctrl.AddBot()

		case cmd == "remove" && len(parts) >= 2 && strings.ToLower(parts[1]) == "bot":
			if err := ctrl.RemoveBot(); err != nil {
				fmt.Println("错误:", err)
			}

		case cmd == "list", cmd == "orders":
			printOrders(ctrl)

		case cmd == "status":
			printStatus(ctrl)

		case cmd == "help":
			fmt.Println("命令列表:")
			fmt.Println("  new normal  - 创建普通订单")
			fmt.Println("  new vip     - 创建 VIP 订单")
			fmt.Println("  add bot     - 添加 Bot")
			fmt.Println("  remove bot  - 移除最新 Bot")
			fmt.Println("  list        - 显示所有订单")
			fmt.Println("  status      - 显示系统状态")
			fmt.Println("  help        - 显示帮助")
			fmt.Println("  exit        - 退出")

		default:
			fmt.Println("未知命令，输入 help 查看帮助")
		}

		fmt.Print("> ")
	}

	return nil
}

func printOrders(ctrl *controller.Controller) {
	orders := ctrl.GetOrders()
	if len(orders) == 0 {
		fmt.Println("暂无订单")
		return
	}
	fmt.Println("────────────────────────────────────────────")
	fmt.Printf("%-8s %-8s %-12s %-8s\n", "订单号", "类型", "状态", "Bot")
	fmt.Println("────────────────────────────────────────────")
	for _, o := range orders {
		botStr := "-"
		if o.BotID > 0 {
			botStr = fmt.Sprintf("Bot#%d", o.BotID)
		}
		fmt.Printf("#%-7d %-8s %-12s %-8s\n", o.ID, o.Type, o.Status, botStr)
	}
	fmt.Println("────────────────────────────────────────────")
}

func printStatus(ctrl *controller.Controller) {
	s := ctrl.GetStatus()
	fmt.Println("──────────────────────────────")
	fmt.Printf("  总订单数:  %d\n", s.TotalOrders)
	fmt.Printf("  待处理:    %d\n", s.Pending)
	fmt.Printf("  处理中:    %d\n", s.Processing)
	fmt.Printf("  已完成:    %d\n", s.Complete)
	fmt.Printf("  活跃 Bot:  %d\n", s.ActiveBots+s.IdleBots)
	fmt.Println("──────────────────────────────")
}
