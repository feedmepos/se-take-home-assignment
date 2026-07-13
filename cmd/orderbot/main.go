// Command orderbot 是「自动做菜机器人」订单控制器的命令行程序。
//
// 从标准输入逐行读取命令（可交互敲入，也可用管道喂脚本）：
//
//	normal | n     下一张普通订单
//	vip    | v     下一张 VIP 订单
//	+bot   | b+     新增一台机器人
//	-bot   | b-     移除最新一台机器人
//	status | s     打印当前 PENDING / COMPLETE / 机器人状态
//	help   | ?     显示帮助
//	quit   | q     停止所有机器人并退出
//
// 所有状态变更事件都带 HH:MM:SS 时间戳，同时打印到终端并写入 result.txt。
package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"orderbot/kitchen"
)

func main() {
	cook := flag.Duration("cook", 10*time.Second, "每张订单的烹饪耗时")
	outPath := flag.String("out", "result.txt", "事件日志输出文件")
	flag.Parse()

	out, err := os.Create(*outPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, "无法创建输出文件:", err)
		os.Exit(1)
	}
	defer out.Close()

	logger := func(msg string) {
		line := time.Now().Format("15:04:05") + " | " + msg
		fmt.Println(line)
		fmt.Fprintln(out, line)
	}

	c := kitchen.New(*cook, logger)
	fmt.Print(help)

	sc := bufio.NewScanner(os.Stdin)
	for sc.Scan() {
		cmd := strings.ToLower(strings.TrimSpace(sc.Text()))
		switch cmd {
		case "":
			// 忽略空行
		case "normal", "n":
			c.NewOrder(kitchen.Normal)
		case "vip", "v":
			c.NewOrder(kitchen.VIP)
		case "+bot", "b+", "bot+":
			c.AddBot()
		case "-bot", "b-", "bot-":
			c.RemoveBot()
		case "status", "s":
			printStatus(os.Stdout, c)
		case "help", "?", "h":
			fmt.Print(help)
		case "quit", "exit", "q":
			c.Shutdown()
			return
		default:
			fmt.Fprintf(os.Stderr, "未知命令: %q（输入 help 查看用法）\n", cmd)
		}
	}
	if err := sc.Err(); err != nil {
		fmt.Fprintln(os.Stderr, "读取输入出错:", err)
	}
	// stdin 结束（如管道喂完）：等待在途订单处理完再收尾，便于脚本观察结果。
	c.Shutdown()
}

func printStatus(w io.Writer, c *kitchen.Controller) {
	s := c.Snapshot()
	fmt.Fprintf(w, "PENDING : %v\n", s.PendingIDs())
	fmt.Fprintf(w, "COMPLETE: %v\n", s.CompleteIDs())
	if len(s.Bots) == 0 {
		fmt.Fprintln(w, "BOTS    : (none)")
		return
	}
	parts := make([]string, len(s.Bots))
	for i, b := range s.Bots {
		if b.IsCooking {
			parts[i] = fmt.Sprintf("#%d->cooking#%d", b.ID, b.Cooking)
		} else {
			parts[i] = fmt.Sprintf("#%d->idle", b.ID)
		}
	}
	fmt.Fprintf(w, "BOTS    : %s\n", strings.Join(parts, "  "))
}

const help = `
=== 自动做菜机器人 订单控制器 ===
命令:
  normal | n     下一张普通订单
  vip    | v     下一张 VIP 订单
  +bot   | b+    新增一台机器人
  -bot   | b-    移除最新一台机器人
  status | s     查看当前状态
  help   | ?     显示本帮助
  quit   | q     退出
`
