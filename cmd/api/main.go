package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"mcmocknald-order-kiosk/internal/config"
	v1 "mcmocknald-order-kiosk/internal/controller/v1"
	"mcmocknald-order-kiosk/internal/domain"
	"mcmocknald-order-kiosk/internal/infrastructure/memory"
	"mcmocknald-order-kiosk/internal/infrastructure/postgres"
	"mcmocknald-order-kiosk/internal/logger"
	"mcmocknald-order-kiosk/internal/service"
	"mcmocknald-order-kiosk/pkg/queue"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "mcmocknald-order-kiosk/docs/swagger" // Import generated docs
)

// @title McMocknald Order Kiosk API
// @version 1.0
// @description API for McMocknald Order Kiosk System - A priority queue based order management system
// @description Supports VIP and Regular customers with automated cook bot assignment

// @contact.name API Support
// @contact.email support@mcmocknald.com

// @host localhost:8080
// @BasePath /
// @schemes http https

// @tag.name orders
// @tag.description Order management endpoints

// @tag.name cooks
// @tag.description Cook management endpoints

// @tag.name foods
// @tag.description Food item display endpoints for kiosk

// Application holds all dependencies
// Following Dependency Injection pattern and MVC architecture
type Application struct {
	Config            *config.Config
	Logger            logger.Logger
	OrderService      service.OrderService
	CookService       service.CookService
	FoodService       service.FoodService
	V1OrderController *v1.OrderController // API v1 controller
	V1CookController  *v1.CookController  // API v1 controller
	V1FoodController  *v1.FoodController  // API v1 controller
	Router            *gin.Engine
}

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize logger
	appLogger, err := logger.NewFileLogger(cfg.LogDirectory)
	if err != nil {
		log.Fatalf("Failed to create logger: %v", err)
	}
	defer appLogger.Close()

	appLogger.Info("Starting McMocknald Order Kiosk System")
	appLogger.Info("Mode: %s", cfg.Mode)

	// Build application with dependency injection
	app, err := buildApplication(cfg, appLogger)
	if err != nil {
		appLogger.Error("Failed to build application: %v", err)
		log.Fatalf("Failed to build application: %v", err)
	}

	// Seed initial data
	if err := seedInitialData(context.Background(), app); err != nil {
		appLogger.Error("Failed to seed initial data: %v", err)
		log.Fatalf("Failed to seed initial data: %v", err)
	}

	// Start HTTP server
	srv := &http.Server{
		Addr:    ":" + cfg.ServerPort,
		Handler: app.Router,
	}

	// Start server in goroutine
	go func() {
		appLogger.Info("Server listening on port %s", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			appLogger.Error("Server error: %v", err)
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	appLogger.Info("Shutting down server...")

	// Graceful shutdown with 30 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Stop worker pool
	app.CookService.StopWorkerPool()

	// Shutdown HTTP server
	if err := srv.Shutdown(ctx); err != nil {
		appLogger.Error("Server forced to shutdown: %v", err)
		log.Fatal("Server forced to shutdown:", err)
	}

	appLogger.Info("Server stopped")
}

// buildApplication constructs the application with all dependencies
// Following Dependency Injection pattern and Open/Closed Principle
// Time Complexity: O(1) - initialization is constant time
func buildApplication(cfg *config.Config, appLogger logger.Logger) (*Application, error) {
	var userRepo domain.UserRepository
	var orderRepo domain.OrderRepository
	var foodRepo domain.FoodRepository

	// Initialize repositories based on mode (Dependency Inversion Principle)
	if cfg.IsMemoryMode() {
		appLogger.Info("Initializing in-memory repositories")
		userRepo = memory.NewUserRepository()
		foodRepo = memory.NewFoodRepository()
		orderRepo = memory.NewOrderRepository(userRepo, foodRepo)

		// Role repo available if needed
		// _ = memory.NewRoleRepository()
	} else {
		appLogger.Info("Initializing PostgreSQL repositories")
		appLogger.Info("Connecting to database: %s:%s/%s", cfg.DBHost, cfg.DBPort, cfg.DBName)

		// Connect to PostgreSQL
		db, err := postgres.NewDatabase(cfg.GetDatabaseDSN())
		if err != nil {
			return nil, fmt.Errorf("failed to connect to database: %w", err)
		}

		userRepo = postgres.NewUserRepository(db)
		orderRepo = postgres.NewOrderRepository(db)
		foodRepo = postgres.NewFoodRepository(db)

		// Role repo available if needed
		// _ = postgres.NewRoleRepository(db)
	}

	// Initialize priority queue
	orderQueue := queue.NewPriorityQueue()

	// Initialize services (Dependency Injection)
	orderService := service.NewOrderService(orderRepo, userRepo, foodRepo, orderQueue, appLogger, cfg.OrderServingDuration)
	cookService := service.NewCookService(userRepo, orderRepo, orderQueue, appLogger, cfg.OrderServingDuration)
	foodService := service.NewFoodService(foodRepo, appLogger)

	// Initialize controllers (Dependency Injection, MVC pattern)
	// API v1 controllers
	v1OrderController := v1.NewOrderController(orderService)
	v1CookController := v1.NewCookController(cookService)
	v1FoodController := v1.NewFoodController(foodService)

	// Initialize router
	router := setupRouter(cfg, v1OrderController, v1CookController, v1FoodController)

	return &Application{
		Config:            cfg,
		Logger:            appLogger,
		OrderService:      orderService,
		CookService:       cookService,
		FoodService:       foodService,
		V1OrderController: v1OrderController,
		V1CookController:  v1CookController,
		V1FoodController:  v1FoodController,
		Router:            router,
	}, nil
}

// setupRouter configures the Gin router with all routes (MVC pattern)
// Supports versioned (v1) routes
func setupRouter(
	cfg *config.Config,
	v1OrderCtrl *v1.OrderController,
	v1CookCtrl *v1.CookController,
	v1FoodCtrl *v1.FoodController,
) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	// Swagger documentation (only in non-production environments)
	if cfg.IsSwaggerEnabled() {
		router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
		log.Println("Swagger UI enabled at http://localhost:" + cfg.ServerPort + "/swagger/index.html")
	}

	// API routes
	api := router.Group("/api")
	{
		// API v1 routes (versioned endpoints)
		v1Group := api.Group("/v1")
		{
			// Order routes v1
			v1Orders := v1Group.Group("/orders")
			{
				v1Orders.POST("", v1OrderCtrl.CreateOrder)        // POST /api/v1/orders
				v1Orders.GET("/:id", v1OrderCtrl.GetOrder)        // GET /api/v1/orders/:id
				v1Orders.GET("/stats", v1OrderCtrl.GetOrderStats) // GET /api/v1/orders/stats
			}

			// Cook routes v1
			v1Cooks := v1Group.Group("/cooks")
			{
				v1Cooks.POST("", v1CookCtrl.CreateCook)                  // POST /api/v1/cooks
				v1Cooks.GET("", v1CookCtrl.GetAllCooks)                  // GET /api/v1/cooks
				v1Cooks.DELETE("/:id", v1CookCtrl.RemoveCook)            // DELETE /api/v1/cooks/:id
				v1Cooks.POST("/:id/reinstate", v1CookCtrl.ReinstateCook) // POST /api/v1/cooks/:id/reinstate
				v1Cooks.POST("/:id/accept", v1CookCtrl.AcceptOrder)      // POST /api/v1/cooks/:id/accept
			}

			// Food routes v1
			v1Foods := v1Group.Group("/foods")
			{
				v1Foods.GET("", v1FoodCtrl.GetAllFoods)     // GET /api/v1/foods?type=Food
				v1Foods.GET("/:id", v1FoodCtrl.GetFoodByID) // GET /api/v1/foods/:id
			}
		}
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	return router
}

// seedInitialData seeds the system with initial data as per requirements
// Requirements: 2 Regular customers, 2 VIP customers, 1 cook bot
func seedInitialData(ctx context.Context, app *Application) error {
	if app.Config.IsMemoryMode() {
		app.Logger.Info("Seeding initial data for memory mode")
		// Note: In memory mode, data needs to be seeded via API calls or directly
		// This is a placeholder - actual seeding would happen through the repositories
		// that are already wired in the application
		app.Logger.Info("Initial data seeding skipped - use API to create data")
	} else {
		// In database mode, data is seeded via migration script
		app.Logger.Info("Database mode: Initial data from migrations")
	}

	return nil
}
