package main

import (
	"testing"
	"time"
	"se-take-home/service"
	"se-take-home/config"
)

// 订单基础功能和分区查询测试
func TestOrderBasicAndPartition(t *testing.T) {
    // 清理全局状态
    config.OrdersPending = nil
    config.OrdersFinished = nil
    config.OrderNoSeed = 0

    o1 := service.CreateOrder(1, 1, 10, false)
    if o1.OrderNo == "" {
        t.Fatal("OrderNo should not be empty")
    }
    if o1.VIP {
        t.Fatal("普通订单VIP应为false")
    }

    o2 := service.CreateOrder(2, 1, 20, true)
    if !o2.VIP {
        t.Fatal("VIP订单VIP应为true")
    }
    // VIP应排在前面
    if config.OrdersPending[0].OrderNo != o2.OrderNo {
        t.Fatalf("VIP订单应排在前面，got %s want %s", config.OrdersPending[0].OrderNo, o2.OrderNo)
    }

    // 分区与全量查询
    finishedOrder := config.OrdersPending[0]
    finishedOrder.Status = "finished"
    config.OrdersFinished = append(config.OrdersFinished, finishedOrder)
    config.OrdersPending = config.OrdersPending[1:]

    all, err := service.GetOrders()
    if err != nil {
        t.Fatal(err)
    }
    if len(all) != 2 {
        t.Fatalf("GetOrders 应返回2条，got %d", len(all))
    }
    pending := service.GetPendingOrders()
    if len(pending) != 1 || pending[0].OrderNo != o1.OrderNo {
        t.Fatalf("GetPendingOrders 返回不正确, pending=%+v, o1=%+v", pending, o1)
    }
    finished := service.GetFinishedOrders()
    if len(finished) != 1 || finished[0].OrderNo != o2.OrderNo {
        t.Fatalf("GetFinishedOrders 返回不正确, finished=%+v, o2=%+v", finished, o2)
    }
}

// 机器人处理订单和数量测试
func TestRobotProcessAndCount(t *testing.T) {
    config.OrdersPending = nil
    config.OrdersFinished = nil
    config.OrderNoSeed = 0
    config.Robots = nil

    // 机器人处理订单
    service.CreateOrder(1, 1, 10, false)
    service.CreateOrder(2, 1, 20, true)
    service.AddRobot()
    time.Sleep(11 * time.Second)
    if len(config.OrdersFinished) == 0 {
        t.Fatal("机器人应能完成订单")
    }
    if config.OrdersFinished[0].Status != "finished" {
        t.Fatal("订单完成状态应为finished")
    }

    // 机器人数量相关
    config.Robots = nil
    count := service.GetRobotCount()
    if count != 0 {
        t.Fatalf("初始机器人数量应为0，got %d", count)
    }
    service.AddRobot()
    if service.GetRobotCount() != 1 {
        t.Fatal("AddRobot 后数量应为1")
    }
    service.RemoveRobot()
    if service.GetRobotCount() != 0 {
        t.Fatal("RemoveRobot 后数量应为0")
    }
    // RemoveRobot 空时不应 panic
    service.RemoveRobot()
    if service.GetRobotCount() != 0 {
        t.Fatal("多次 RemoveRobot 后数量应为0")
    }
}
