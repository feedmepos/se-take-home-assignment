package handlers

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "order-management/service"
)

func RegisterOrderRoutes(r *gin.Engine, m *service.Manager) {
    r.POST("/order/normal", func(c *gin.Context) {
        o := m.AddOrder(service.Normal)
        c.JSON(http.StatusOK, o)
    })

    r.POST("/order/vip", func(c *gin.Context) {
        o := m.AddOrder(service.VIP)
        c.JSON(http.StatusOK, o)
    })

    r.GET("/orders", func(c *gin.Context) {
        snap := m.Snapshot()
        // reuse service sorting: completed by completion time, others by ID
        list := service.SortCompleted(snap.Orders)
        c.JSON(http.StatusOK, gin.H{"all": list, "pending_queue": snap.Pending, "bot_count": snap.BotCount})
    })
}
