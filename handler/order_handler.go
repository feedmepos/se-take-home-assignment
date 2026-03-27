package handler

import (
	"net/http"
	"strconv"
	"github.com/gin-gonic/gin"
	"se-take-home/service"
)

// 查询所有订单（含状态）
func GetOrderList(c *gin.Context) {
	orders, err := service.GetOrders()
	if err != nil {
		c.String(http.StatusInternalServerError, "order query failed")
		return
	}
	c.JSON(http.StatusOK, orders)
}

// 查询待处理订单
func GetPendingOrders(c *gin.Context) {
	c.JSON(http.StatusOK, service.GetPendingOrders())
}

// 查询已完成订单
func GetFinishedOrders(c *gin.Context) {
	c.JSON(http.StatusOK, service.GetFinishedOrders())
}

// 新建订单
func CreateOrder(c *gin.Context) {
	var req struct {
		UserID int     `json:"user_id"`
		ShopID int     `json:"shop_id"`
		Amount float64 `json:"amount"`
		VIP    bool    `json:"vip"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.String(http.StatusBadRequest, "param error")
		return
	}
	order := service.CreateOrder(req.UserID, req.ShopID, req.Amount, req.VIP)
	c.JSON(http.StatusOK, order)
}

// 查询机器人数量
func GetRobotCount(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"count": service.GetRobotCount()})
}

// 增加机器人
func AddRobot(c *gin.Context) {
	id := service.AddRobot()
	c.String(http.StatusOK, strconv.Itoa(id))
}

// 移除机器人
func RemoveRobot(c *gin.Context) {
	service.RemoveRobot()
	c.String(http.StatusOK, "ok")
}
