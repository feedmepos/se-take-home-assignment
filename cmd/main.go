package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/labstack/echo/v4"

	"order-controller/internal/db"
	"order-controller/internal/services"
)

// Response DTOs

type ErrorResponse struct {
	Error string `json:"error"`
}

type OrderDTO struct {
	ID        int       `json:"id"`
	Type      string    `json:"type"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type OrdersResponse struct {
	Orders    []OrderDTO `json:"orders"`
	Timestamp string     `json:"timestamp"`
}

type BotDTO struct {
	ID             int    `json:"id"`
	Status         string `json:"status"`
	CurrentOrderID *int   `json:"current_order_id,omitempty"`
}

type BotsResponse struct {
	Bots      []BotDTO `json:"bots"`
	Timestamp string   `json:"timestamp"`
}

type StatusBotDTO struct {
	ID               int    `json:"id"`
	Status           string `json:"status"`
	CurrentOrderID   *int   `json:"current_order_id,omitempty"`
	RemainingSeconds *int   `json:"remaining_seconds,omitempty"`
}

type StatusResponse struct {
	Bots      []StatusBotDTO `json:"bots"`
	Pending   []OrderDTO     `json:"pending"`
	Completed []OrderDTO     `json:"completed"`
	Timestamp string         `json:"timestamp"`
}

// Server holds all dependencies for the HTTP server
type Server struct {
	Echo         *echo.Echo
	OrderService *services.OrderService
	BotService   *services.BotService
	BotTimers    map[int]*time.Timer
	mu           sync.Mutex
}

// NewServer creates a new server instance with the given database
func NewServer(database *db.Database) *Server {
	s := &Server{
		Echo:         echo.New(),
		OrderService: services.NewOrderService(database),
		BotService:   services.NewBotService(database),
		BotTimers:    make(map[int]*time.Timer),
	}

	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	s.Echo.GET("/", func(c echo.Context) error {
		return c.File("cmd/index.html")
	})

	s.Echo.GET("/health", func(c echo.Context) error {
		return c.NoContent(http.StatusOK)
	})

	s.Echo.POST("/orders/normal", func(c echo.Context) error {
		if err := s.OrderService.CreateOrder(services.OrderTypeNormal); err != nil {
			return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		}
		s.tryAssignOrders()
		return c.NoContent(http.StatusNoContent)
	})

	s.Echo.POST("/orders/vip", func(c echo.Context) error {
		if err := s.OrderService.CreateOrder(services.OrderTypeVIP); err != nil {
			return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		}
		s.tryAssignOrders()
		return c.NoContent(http.StatusNoContent)
	})

	s.Echo.GET("/orders", func(c echo.Context) error {
		var orders []*services.Order

		switch c.QueryParam("status") {
		case "pending":
			orders = s.OrderService.GetPendingOrders()
		case "completed":
			orders = s.OrderService.GetCompletedOrders()
		default:
			orders = s.OrderService.GetAllOrders()
		}

		response := OrdersResponse{
			Orders:    make([]OrderDTO, len(orders)),
			Timestamp: time.Now().Format("15:04:05"),
		}
		for i, o := range orders {
			response.Orders[i] = OrderDTO{
				ID:        o.ID,
				Type:      string(o.Type),
				Status:    string(o.Status),
				CreatedAt: o.CreatedAt,
			}
		}

		return c.JSON(http.StatusOK, response)
	})

	s.Echo.POST("/bots", func(c echo.Context) error {
		bot, err := s.BotService.CreateBot()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		}

		s.mu.Lock()
		s.assignOrderToBot(bot)
		s.mu.Unlock()

		return c.NoContent(http.StatusNoContent)
	})

	s.Echo.DELETE("/bots", func(c echo.Context) error {
		s.mu.Lock()
		defer s.mu.Unlock()

		bot, err := s.BotService.RemoveNewestBot()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		}

		if bot == nil {
			return c.NoContent(http.StatusNoContent)
		}

		if timer, exists := s.BotTimers[bot.ID]; exists {
			timer.Stop()
			delete(s.BotTimers, bot.ID)
		}

		if bot.CurrentOrderID != 0 {
			s.OrderService.UpdateOrderStatus(bot.CurrentOrderID, services.OrderStatusPending)
		}

		return c.NoContent(http.StatusNoContent)
	})

	s.Echo.GET("/bots", func(c echo.Context) error {
		bots, err := s.BotService.GetAllBots()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		}

		response := BotsResponse{
			Bots:      make([]BotDTO, len(bots)),
			Timestamp: time.Now().Format("15:04:05"),
		}
		for i, b := range bots {
			response.Bots[i] = BotDTO{
				ID:     b.ID,
				Status: string(b.Status),
			}
			if b.CurrentOrderID != 0 {
				response.Bots[i].CurrentOrderID = &b.CurrentOrderID
			}
		}

		return c.JSON(http.StatusOK, response)
	})

	s.Echo.GET("/status", func(c echo.Context) error {
		pending := s.OrderService.GetPendingOrders()
		completed := s.OrderService.GetCompletedOrders()
		bots, _ := s.BotService.GetAllBots()

		response := StatusResponse{
			Bots:      make([]StatusBotDTO, len(bots)),
			Pending:   make([]OrderDTO, len(pending)),
			Completed: make([]OrderDTO, len(completed)),
			Timestamp: time.Now().Format("15:04:05"),
		}

		for i, o := range pending {
			response.Pending[i] = OrderDTO{
				ID:        o.ID,
				Type:      string(o.Type),
				Status:    string(o.Status),
				CreatedAt: o.CreatedAt,
			}
		}

		for i, o := range completed {
			response.Completed[i] = OrderDTO{
				ID:        o.ID,
				Type:      string(o.Type),
				Status:    string(o.Status),
				CreatedAt: o.CreatedAt,
			}
		}

		for i, b := range bots {
			response.Bots[i] = StatusBotDTO{
				ID:     b.ID,
				Status: string(b.Status),
			}
			if b.CurrentOrderID != 0 {
				response.Bots[i].CurrentOrderID = &b.CurrentOrderID
				remaining := 10 - int(time.Since(b.ProcessingStartedAt).Seconds())
				if remaining < 0 {
					remaining = 0
				}
				response.Bots[i].RemainingSeconds = &remaining
			}
		}

		return c.JSON(http.StatusOK, response)
	})
}

func (s *Server) tryAssignOrders() {
	s.mu.Lock()
	defer s.mu.Unlock()

	bots, _ := s.BotService.GetIdleBots()
	for _, bot := range bots {
		s.assignOrderToBot(bot)
	}
}

func (s *Server) assignOrderToBot(bot *services.Bot) {
	order := s.OrderService.GetNextPendingOrder()
	if order == nil {
		return
	}

	s.BotService.AssignOrderToBot(bot.ID, order.ID)
	s.OrderService.UpdateOrderStatus(order.ID, services.OrderStatusProcessing)

	log.Printf("[%s] Bot #%d started processing %s order #%d", time.Now().Format("15:04:05"), bot.ID, order.Type, order.ID)

	s.BotTimers[bot.ID] = time.AfterFunc(10*time.Second, func() {
		s.completeOrder(bot.ID, order.ID)
	})
}

func (s *Server) completeOrder(botID int, orderID int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	bot, err := s.BotService.GetBot(botID)
	if err != nil {
		return
	}

	order := s.OrderService.GetOrder(orderID)
	if order == nil {
		return
	}

	s.OrderService.UpdateOrderStatus(orderID, services.OrderStatusComplete)
	s.BotService.CompleteOrder(botID)

	delete(s.BotTimers, botID)

	log.Printf("[%s] Bot #%d completed %s order #%d -> moved to COMPLETE", time.Now().Format("15:04:05"), bot.ID, order.Type, order.ID)

	bot.Status = services.BotStatusIdle
	bot.CurrentOrderID = 0
	s.assignOrderToBot(bot)
}

func main() {
	database, err := db.New(":memory:")
	if err != nil {
		log.Fatalf("[%s] Failed to initialize database: %v", time.Now().Format("15:04:05"), err)
	}
	defer database.Close()

	server := NewServer(database)

	server.Echo.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			err := next(c)
			status := c.Response().Status
			ts := time.Now().Format("15:04:05")
			msg := fmt.Sprintf("[%s] %s %s %d", ts, c.Request().Method, c.Request().URL.Path, status)

			if status >= 500 {
				log.Printf("ERROR %s", msg)
			} else if status >= 400 {
				log.Printf("WARN  %s", msg)
			} else {
				log.Printf("INFO  %s", msg)
			}
			return err
		}
	})

	log.Printf("[%s] === McDonald's Order Controller API ===", time.Now().Format("15:04:05"))
	log.Printf("[%s] Server starting on port 8080", time.Now().Format("15:04:05"))

	server.Echo.Logger.Fatal(server.Echo.Start(":8080"))
}
