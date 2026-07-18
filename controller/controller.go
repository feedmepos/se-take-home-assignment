package controller

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/feedmepos/se-take-home-assignment/model"
	"github.com/feedmepos/se-take-home-assignment/utils"
)

// Controller 订单控制器，管理订单队列和机器人池
type Controller struct {
	mu              sync.Mutex
	orders          []*model.Order
	bots            []*model.Bot
	orderIDGen      *utils.IDGenerator
	botIDGen        *utils.IDGenerator
	completedOrders []*model.Order
	processDuration time.Duration
	wakeCh          chan struct{} // 通知空闲 Bot 有新订单
}

// New 创建一个新的 Controller 实例
// processDuration 是每个订单的处理时长（生产环境为 10 秒，测试环境可缩短）
func New(processDuration time.Duration) *Controller {
	return &Controller{
		orderIDGen:      utils.New(1001),
		botIDGen:        utils.New(1),
		processDuration: processDuration,
		wakeCh:          make(chan struct{}, 64),
	}
}

// CreateNormalOrder 创建一个普通订单，返回订单 ID
func (c *Controller) CreateNormalOrder() int {
	return c.createOrder(model.Normal)
}

// CreateVIPOrder 创建一个 VIP 订单，返回订单 ID
func (c *Controller) CreateVIPOrder() int {
	return c.createOrder(model.VIP)
}

// createOrder 创建订单并插入到队列的合适位置
// VIP 订单插入到所有 VIP 之后、所有普通订单之前
// 普通订单追加到队列末尾
func (c *Controller) createOrder(orderType model.OrderType) int {
	c.mu.Lock()

	order := &model.Order{
		ID:     c.orderIDGen.Next(),
		Type:   orderType,
		Status: model.OrderPending,
	}

	if orderType == model.VIP {
		c.insertBeforeNormal(order)
	} else {
		c.orders = append(c.orders, order)
	}

	fmt.Printf("[%s] Created %s Order #%d - Status: PENDING\n", timestamp(), order.Type, order.ID)
	c.mu.Unlock()

	c.notifyBot()
	return order.ID
}

// insertBeforeNormal 将订单插入到第一个普通订单之前（必须在持有 mu 时调用）
func (c *Controller) insertBeforeNormal(order *model.Order) {
	idx := len(c.orders)
	for i, o := range c.orders {
		if o.Type == model.Normal {
			idx = i
			break
		}
	}
	c.orders = append(c.orders[:idx], append([]*model.Order{order}, c.orders[idx:]...)...)
}

// returnCurrentOrder 将 bot 当前持有的订单退回 PENDING 队列（必须在持有 mu 时调用）
// VIP 订单插入到所有 Normal 订单之前，Normal 订单追加到队列末尾以保持原有顺序
func (c *Controller) returnCurrentOrder(bot *model.Bot) {
	if order := bot.ReleaseOrder(); order != nil {
		if order.Type == model.VIP {
			c.insertBeforeNormal(order)
		} else {
			c.orders = append(c.orders, order)
		}
		c.notifyBot()
	}
}

// AddBot 添加一个机器人，返回机器人 ID
func (c *Controller) AddBot() int {
	c.mu.Lock()
	defer c.mu.Unlock()

	ctx, cancel := context.WithCancel(context.Background())
	bot := model.NewBot(c.botIDGen.Next(), ctx, cancel)

	c.bots = append(c.bots, bot)

	fmt.Printf("[%s] Bot #%d created - Status: ACTIVE\n", timestamp(), bot.ID)

	go c.botLoop(bot)
	return bot.ID
}

// RemoveBot 移除最新的机器人
// 若 Bot 正在处理订单，订单退回 PENDING 区并保持优先级
func (c *Controller) RemoveBot() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.bots) == 0 {
		return fmt.Errorf("no bots to remove")
	}

	bot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	bot.Cancel()

	if bot.HasOrder() {
		orderType, orderID := bot.OrderType(), bot.OrderID()
		c.returnCurrentOrder(bot)
		fmt.Printf("[%s] Bot #%d destroyed while processing - %s Order #%d returned to PENDING\n",
			timestamp(), bot.ID, orderType, orderID)
	} else {
		fmt.Printf("[%s] Bot #%d destroyed while IDLE\n", timestamp(), bot.ID)
	}

	return nil
}

func (c *Controller) notifyBot() {
	select {
	case c.wakeCh <- struct{}{}:
	default:
	}
}

// dequeueOrder 从队列头部取出一个待处理订单（必须在持有 mu 时调用）
func (c *Controller) dequeueOrder() *model.Order {
	if len(c.orders) == 0 {
		return nil
	}
	order := c.orders[0]
	c.orders = c.orders[1:]
	order.Status = model.OrderProcessing
	return order
}

// botLoop 每个 Bot 独立的 goroutine 工作循环
func (c *Controller) botLoop(bot *model.Bot) {
	for {
		c.mu.Lock()

		// 检查是否被取消
		select {
		case <-bot.Ctx.Done():
			c.returnCurrentOrder(bot)
			c.mu.Unlock()
			return
		default:
		}

		order := c.dequeueOrder()
		if order != nil {
			bot.TakeOrder(order)
			c.mu.Unlock()

			fmt.Printf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING\n",
				timestamp(), bot.ID, order.Type, order.ID)

			// 等待处理完成或被取消
			select {
			case <-time.After(c.processDuration):
				c.mu.Lock()
				if bot.CompleteOrder(order) != nil {
					c.completedOrders = append(c.completedOrders, order)
				}
				c.mu.Unlock()
				if order.Status == model.OrderComplete {
					fmt.Printf("[%s] Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)\n",
						timestamp(), bot.ID, order.Type, order.ID)
				}

			case <-bot.Ctx.Done():
				c.mu.Lock()
				c.returnCurrentOrder(bot)
				c.mu.Unlock()
				return
			}
		} else {
			c.mu.Unlock()

			// 等待新订单通知或取消
			select {
			case <-c.wakeCh:
			case <-bot.Ctx.Done():
				return
			}
		}
	}
}

// PendingOrders 返回当前待处理订单数
func (c *Controller) PendingOrders() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.orders)
}

// PendingOrdersByType 返回待处理订单中 VIP 和 Normal 各多少
func (c *Controller) PendingOrdersByType() (vip, normal int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, o := range c.orders {
		switch o.Type {
		case model.VIP:
			vip++
		case model.Normal:
			normal++
		}
	}
	return
}

// ActiveBots 返回当前活跃的 Bot 数量
func (c *Controller) ActiveBots() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.bots)
}

// ProcessingOrders 返回当前处理中的订单数
func (c *Controller) ProcessingOrders() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	count := 0
	for _, bot := range c.bots {
		if bot.HasOrder() {
			count++
		}
	}
	return count
}

// ProcessingOrdersByType 返回处理中订单中 VIP 和 Normal 各多少
func (c *Controller) ProcessingOrdersByType() (vip, normal int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, bot := range c.bots {
		if bot.HasOrder() {
			switch bot.OrderType() {
			case model.VIP:
				vip++
			case model.Normal:
				normal++
			}
		}
	}
	return
}

// CompletedOrders 返回已完成的订单总数
func (c *Controller) CompletedOrders() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.completedOrders)
}

// CompletedOrdersByType 返回已完成订单中 VIP 和 Normal 各多少
func (c *Controller) CompletedOrdersByType() (vip, normal int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, o := range c.completedOrders {
		switch o.Type {
		case model.VIP:
			vip++
		case model.Normal:
			normal++
		}
	}
	return
}

// TotalVIPOrders 返回创建的 VIP 订单总数
func (c *Controller) TotalVIPOrders() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.countByType(model.VIP)
}

// TotalNormalOrders 返回创建的普通订单总数
func (c *Controller) TotalNormalOrders() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.countByType(model.Normal)
}

// countByType 统计指定类型的订单数（pending + processing + completed），必须在持有 mu 时调用
func (c *Controller) countByType(orderType model.OrderType) int {
	count := 0
	for _, o := range c.orders {
		if o.Type == orderType {
			count++
		}
	}
	for _, o := range c.completedOrders {
		if o.Type == orderType {
			count++
		}
	}
	for _, bot := range c.bots {
		if bot.HasOrder() && bot.OrderType() == orderType {
			count++
		}
	}
	return count
}

// Shutdown 关闭所有 Bot 并清理资源
func (c *Controller) Shutdown() {
	c.mu.Lock()
	defer c.mu.Unlock()

	for _, bot := range c.bots {
		bot.Cancel()
	}
	c.bots = nil
}

// timestamp 返回当前时间的 HH:MM:SS 格式字符串
func timestamp() string {
	return time.Now().Format("15:04:05")
}
