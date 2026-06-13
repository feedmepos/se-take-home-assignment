package handlers

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "order-management/service"
)

func RegisterBotRoutes(r *gin.Engine, m *service.Manager) {
    r.POST("/bot/add", func(c *gin.Context) {
        b := m.AddBot()
        c.JSON(http.StatusOK, gin.H{"bot": b.ID})
    })

    r.POST("/bot/remove", func(c *gin.Context) {
        b := m.RemoveBot()
        if b == nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "no bots"})
            return
        }
        c.JSON(http.StatusOK, gin.H{"removed": b.ID})
    })
}
