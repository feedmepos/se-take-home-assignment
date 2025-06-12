package cmd

import (
	"bufio"
	"context"
	"encoding/json"
	"log"
	"os"
	"strconv"
	"strings"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/controller"
)

const (
	CmdTypeCustomerCreateOrder string = "customer_create_order"
	CmdTypeManagerAddBot       string = "manager_add_bot"
	CmdTypeManagerDecrBot      string = "manager_decr_bot"
	CmdTypeScreen              string = "screen"
)

func RunCmdLoopHandler() {
	reader := bufio.NewReader(os.Stdin)
	log.Println("欢迎来到麦当劳点餐系统")

	for {
		cmdline, _ := reader.ReadString('\n')
		cmdline = strings.TrimSpace(cmdline)

		splits := strings.Split(cmdline, " ")
		if len(splits) == 0 {
			log.Panicln("错误指令")
			continue
		}

		cmdType := splits[0]
		switch cmdType {
		case CmdTypeCustomerCreateOrder:
			handleCmdTypeCustomerCreateOrder(context.Background(), splits)
		case CmdTypeManagerAddBot:
			handleCmdTypeManagerAddBot(context.Background())
		case CmdTypeManagerDecrBot:
			handleCmdTypeManagerDecrBot(context.Background())
		case CmdTypeScreen:
			handleCmdTypeScreen(context.Background())
		default:
			log.Printf("未知指令: %s\n", cmdType)
			continue
		}
	}

}

func handleCmdTypeCustomerCreateOrder(ctx context.Context, cmds []string) {
	if len(cmds) <= 2 {
		log.Println("需要 CustomerID 和 Priority 参数")
		return
	}

	customerIDStr := cmds[1]
	customerID, _ := strconv.ParseInt(customerIDStr, 10, 64)
	if customerID <= 0 {
		log.Println("CustomerID 无效")
		return
	}

	priorityStr := cmds[2]
	priority, _ := strconv.Atoi(priorityStr)

	if v, err := controller.CreateOrder(ctx, customerID, consts.OrderPriority(priority)); err != nil {
		log.Printf("创建订单失败: %v\n", err.Error())
	} else {
		log.Printf("创建订单成功，ID=%v\n", v.OrderID)
	}
}

func handleCmdTypeManagerAddBot(ctx context.Context) {
	controller.AddBot(ctx)
}

func handleCmdTypeManagerDecrBot(ctx context.Context) {
	if err := controller.DecrBot(ctx); err != nil {
		log.Printf("删除机器人失败: %s\n", err.Error())
	}
}

func handleCmdTypeScreen(ctx context.Context) {
	screenView := controller.DisplayScreen(ctx)

	if bytes, err := json.Marshal(screenView); err != nil {
		log.Println("序列化失败", err.Error())
	} else {
		log.Printf("%v\n", string(bytes))
	}
}
