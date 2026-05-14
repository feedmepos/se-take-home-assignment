package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"
)

// ---------------- 1. 数据模型 ----------------

type Order struct {
	ID        int    `json:"id"`
	IsVIP     bool   `json:"isVip"`
	Status    string `json:"status"`
	DoneTime  string `json:"doneTime"`
}

type Bot struct {
	ID           int    `json:"id"`
	IsBusy       bool   `json:"isBusy"`
	CurrentOrder *Order `json:"currentOrder"`
	stopChan     chan struct{}
}

type SystemStatus struct {
	Pending   []Order `json:"pending"`
	Bots      []Bot   `json:"bots"`
	Completed []Order `json:"completed"`
}

// ---------------- 2. 全局变量 ----------------

var (
	mu           sync.Mutex
	orderCounter = 1
	pending      = []Order{}
	completed    = []Order{}
	bots         = []*Bot{}
	logFile      *os.File
)

// ---------------- 3. 核心业务逻辑 ----------------

// 记录日志到文件和终端
func logToResult(msg string) {
	timestamp := time.Now().Format("15:04:05")
	entry := fmt.Sprintf("[%s] %s\n", timestamp, msg)
	fmt.Print(entry)
	if logFile != nil {
		logFile.WriteString(entry)
	}
}

// 订单处理循环
func processOrders() {
	for {
		mu.Lock()
		for _, bot := range bots {
			if !bot.IsBusy && len(pending) > 0 {
				// 取出 PENDING 区域的第一个订单
				order := pending[0]
				pending = pending[1:]
				
				bot.IsBusy = true
				bot.CurrentOrder = &order
				
				// 启动烹饪协程
				go func(b *Bot, o Order) {
					timer := time.NewTimer(10 * time.Second)
					select {
					case <-timer.C:
						// 完成处理
						mu.Lock()
						o.Status = "COMPLETE"
						o.DoneTime = time.Now().Format("15:04:05")
						completed = append(completed, o)
						b.IsBusy = false
						b.CurrentOrder = nil
						logToResult(fmt.Sprintf("Order #%d COMPLETED by Bot #%d", o.ID, b.ID))
						mu.Unlock()
					case <-b.stopChan:
						// Bot 被销毁，订单退回原位
						mu.Lock()
						requeueOrder(o)
						b.IsBusy = false
						b.CurrentOrder = nil
						logToResult(fmt.Sprintf("Bot #%d destroyed. Order #%d returned to PENDING.", b.ID, o.ID))
						mu.Unlock()
					}
				}(bot, order)
			}
		}
		mu.Unlock()
		time.Sleep(500 * time.Millisecond)
	}
}

// 优先级入队逻辑
func requeueOrder(o Order) {
	if o.IsVIP {
		// VIP 放在所有 VIP 之后，但 Normal 之前
		idx := 0
		for i, po := range pending {
			if po.IsVIP {
				idx = i + 1
			} else {
				break
			}
		}
		pending = append(pending[:idx], append([]Order{o}, pending[idx:]...)...)
	} else {
		// Normal 直接放末尾
		pending = append(pending, o)
	}
}

// ---------------- 4. API 逻辑 (供前端调用) ----------------

func handleStatus(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	
	// 转换 Bot 结构以便 JSON 输出（避开 channel）
	displayBots := make([]Bot, len(bots))
	for i, b := range bots {
		displayBots[i] = Bot{ID: b.ID, IsBusy: b.IsBusy, CurrentOrder: b.CurrentOrder}
	}
	
	json.NewEncoder(w).Encode(SystemStatus{
		Pending:   pending,
		Bots:      displayBots,
		Completed: completed,
	})
}

func handleAddOrder(w http.ResponseWriter, r *http.Request) {
	isVip := r.URL.Query().Get("type") == "vip"
	mu.Lock()
	o := Order{ID: orderCounter, IsVIP: isVip, Status: "PENDING"}
	orderCounter++
	requeueOrder(o)
	mu.Unlock()
	logToResult(fmt.Sprintf("New %v Order #%d added.", map[bool]string{true: "VIP", false: "Normal"}[isVip], o.ID))
}

func handleBot(w http.ResponseWriter, r *http.Request) {
	action := r.URL.Query().Get("action")
	mu.Lock()
	defer mu.Unlock()
	if action == "add" {
		bot := &Bot{ID: len(bots) + 1, stopChan: make(chan struct{})}
		bots = append(bots, bot)
		logToResult(fmt.Sprintf("Bot #%d created.", bot.ID))
	} else if len(bots) > 0 {
		last := bots[len(bots)-1]
		close(last.stopChan)
		bots = bots[:len(bots)-1]
		logToResult(fmt.Sprintf("Bot #%d destroyed.", last.ID))
	}
}

// ---------------- 5. 入口函数 ----------------

func main() {
	// 初始化 result.txt
	var err error
	logFile, err = os.OpenFile("result.txt", os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0666)
	if err != nil {
		panic(err)
	}
	defer logFile.Close()

	go processOrders()

	// GitHub Actions 自动化模式
	if os.Getenv("GITHUB_ACTIONS") == "true" {
		runAutomation()
		return
	}

	// 交互模式/静态服务
	http.HandleFunc("/status", handleStatus)
	http.HandleFunc("/add-order", handleAddOrder)
	http.HandleFunc("/bot", handleBot)
	http.Handle("/", http.FileServer(http.Dir(".")))

	fmt.Println("McDonald's Bot Controller started at http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}

func runAutomation() {
	logToResult("--- GitHub Actions Automation Start ---")
	
	// 模拟动作 1: 添加普通订单和 VIP 订单
	mu.Lock()
	requeueOrder(Order{ID: 1, IsVIP: false})
	requeueOrder(Order{ID: 2, IsVIP: true})
	orderCounter = 3
	mu.Unlock()
	logToResult("Added Normal #1 and VIP #2")

	// 模拟动作 2: 添加 Bot
	mu.Lock()
	bot := &Bot{ID: 1, stopChan: make(chan struct{})}
	bots = append(bots, bot)
	mu.Unlock()
	logToResult("Bot #1 created")

	// 模拟动作 3: 等待完成
	logToResult("Waiting 11s for order completion...")
	time.Sleep(11 * time.Second)

	logToResult("--- GitHub Actions Automation End ---")
}