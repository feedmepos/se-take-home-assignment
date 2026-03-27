package service

import (
	"se-take-home/model"
	"se-take-home/config"
	"fmt"
	"time"
)

// 订单列表
func GetOrders() ([]model.Order, error) {
	all := make([]model.Order, 0, len(config.OrdersPending)+len(config.OrdersFinished))
	all = append(all, config.OrdersPending...)
	all = append(all, config.OrdersFinished...)
	return all, nil
}

// 获取分区订单
func GetPendingOrders() []model.Order {
	return append([]model.Order{}, config.OrdersPending...)
}
func GetFinishedOrders() []model.Order {
	return append([]model.Order{}, config.OrdersFinished...)
}

// 新建订单
func CreateOrder(userID int, shopID int, amount float64, vip bool) model.Order {
       config.OrdersLock.Lock()
       defer config.OrdersLock.Unlock()
       now := time.Now().Format("2006-01-02 15:04:05")
       order := model.Order{
	       ID:        config.OrderNoSeed,
	       OrderNo:   formatOrderNo(config.OrderNoSeed),
	       UserID:    userID,
	       ShopID:    shopID,
	       Amount:    amount,
	       CreatedAt: now,
	       VIP:       vip,
	       Status:    "pending",
       }
       config.OrderNoSeed++
       if vip {
	       idx := 0
	       for idx < len(config.OrdersPending) && config.OrdersPending[idx].VIP {
		       idx++
	       }
	       config.OrdersPending = append(config.OrdersPending[:idx], append([]model.Order{order}, config.OrdersPending[idx:]...)...)
       } else {
	       config.OrdersPending = append(config.OrdersPending, order)
       }
       return order
}

func formatOrderNo(n int) string {
	return fmt.Sprintf("%06d", n)
}

// 获取机器人数量
func GetRobotCount() int {
	return len(config.Robots)
}

func AddRobot() int {
	config.OrdersLock.Lock()
	id := config.RobotIdSeed
	config.RobotIdSeed++
	robot := &config.Robot{ID: id, StopChan: make(chan struct{}, 1)}
	config.Robots = append(config.Robots, robot)
	config.OrdersLock.Unlock()
	go robotLoop(robot)
	return id
}

func RemoveRobot() {
	config.OrdersLock.Lock()
	n := len(config.Robots)
	if n == 0 {
		config.OrdersLock.Unlock()
		return
	}
	robot := config.Robots[n-1]
	config.Robots = config.Robots[:n-1]
	config.OrdersLock.Unlock()
	if robot.Working {
		robot.StopChan <- struct{}{}
	}
}

func robotLoop(robot *config.Robot) {
       for {
	       config.OrdersLock.Lock()
	       if len(config.OrdersPending) == 0 {
		       robot.Working = false
		       config.OrdersLock.Unlock()
		       time.Sleep(1 * time.Second)
		       continue
	       }
	       order := config.OrdersPending[0]
	       config.OrdersPending = config.OrdersPending[1:]
	       robot.Working = true
	       config.OrdersLock.Unlock()

	       select {
	       case <-robot.StopChan:
		       // 订单还原到pending状态
		       config.OrdersLock.Lock()
		       if order.VIP {
			       idx := 0
			       for idx < len(config.OrdersPending) && config.OrdersPending[idx].VIP {
				       idx++
			       }
			       config.OrdersPending = append(config.OrdersPending[:idx], append([]model.Order{order}, config.OrdersPending[idx:]...)...)
		       } else {
			       config.OrdersPending = append(config.OrdersPending, order)
		       }
		       robot.Working = false
		       config.OrdersLock.Unlock()
		       // 彻底退出goroutine，防止已移除机器人继续处理
		       return
	       case <-time.After(10 * time.Second):
		       // 10秒后订单完成
		       order.Status = "finished"
		       config.OrdersLock.Lock()
		       config.OrdersFinished = append(config.OrdersFinished, order)
		       robot.Working = false
		       config.OrdersLock.Unlock()

			   fmt.Printf("%s Order Finished: %s User:%d Amount:%.2f\n", time.Now().Format("15:04:05"), order.OrderNo, order.UserID, order.Amount)
	       }
       }
}
