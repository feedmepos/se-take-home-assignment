package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
	"mcmocknald-order-kiosk/internal/logger"
	"mcmocknald-order-kiosk/pkg/queue"
)

// CookService defines the interface for cook bot operations
// Following Interface Segregation Principle: focused interface
type CookService interface {
	// CreateCook creates a new cook bot
	CreateCook(ctx context.Context, name string) (*domain.User, error)

	// RemoveCook soft deletes a cook bot and returns their order to queue
	RemoveCook(ctx context.Context, cookID int) error

	// ReinstateCook reinstates a soft-deleted cook bot
	ReinstateCook(ctx context.Context, cookID int) error

	// GetCook retrieves a cook by ID
	GetCook(ctx context.Context, cookID int) (*domain.User, error)

	// GetAllCooks retrieves all cooks
	GetAllCooks(ctx context.Context, includeDeleted bool) ([]*domain.User, error)

	// AcceptOrder assigns an order from the queue to a cook and processes it
	AcceptOrder(ctx context.Context, cookID int) (*domain.Order, error)

	// StartWorkerPool starts the worker pool with N cook bots
	StartWorkerPool(ctx context.Context, numCooks int) error

	// StopWorkerPool stops all workers gracefully
	StopWorkerPool()
}

// cookService implements cook bot business logic
// Following Single Responsibility Principle: manages cook lifecycle and order processing
// Dependency Injection: all dependencies injected via constructor
type cookService struct {
	userRepo        domain.UserRepository
	orderRepo       domain.OrderRepository
	orderQueue      queue.OrderQueue
	logger          logger.Logger
	servingDuration time.Duration

	// Worker pool management
	workers   map[int]*cookWorker // Map of cook ID to worker
	workersMu sync.RWMutex        // Protects workers map
	stopChan  chan struct{}       // Signal to stop all workers
	wg        sync.WaitGroup      // Wait for all workers to finish
}

// cookWorker represents a worker goroutine processing orders
type cookWorker struct {
	cookID    int
	stopChan  chan struct{}
	isRunning bool
}

// NewCookService creates a new cook service
// Following Dependency Injection pattern
func NewCookService(
	userRepo domain.UserRepository,
	orderRepo domain.OrderRepository,
	orderQueue queue.OrderQueue,
	log logger.Logger,
	servingDuration time.Duration,
) CookService {
	return &cookService{
		userRepo:        userRepo,
		orderRepo:       orderRepo,
		orderQueue:      orderQueue,
		logger:          log,
		servingDuration: servingDuration,
		workers:         make(map[int]*cookWorker),
		stopChan:        make(chan struct{}),
	}
}

// CreateCook creates a new cook bot
// Time Complexity: O(1) for in-memory, O(log n) for database
func (s *cookService) CreateCook(ctx context.Context, name string) (*domain.User, error) {
	cook := &domain.User{
		Name: name,
		Role: domain.RoleCook,
	}

	createdCook, err := s.userRepo.Create(ctx, cook)
	if err != nil {
		s.logger.Error("Failed to create cook: %v", err)
		return nil, fmt.Errorf("failed to create cook: %w", err)
	}

	s.logger.Info("Cook bot created: %s (ID: %d)", createdCook.Name, createdCook.ID)
	return createdCook, nil
}

// RemoveCook soft deletes a cook bot and returns their order to queue
// Time Complexity: O(1) for in-memory, O(log n + m) for database where m is orders
func (s *cookService) RemoveCook(ctx context.Context, cookID int) error {
	// Validate cook exists
	cook, err := s.userRepo.GetByID(ctx, cookID)
	if err != nil {
		s.logger.Error("Failed to get cook %d: %v", cookID, err)
		return fmt.Errorf("cook not found: %w", err)
	}

	if !cook.IsCook() {
		s.logger.Error("User %d is not a cook", cookID)
		return fmt.Errorf("user is not a cook")
	}

	if cook.IsDeleted() {
		s.logger.Error("Cook %d is already deleted", cookID)
		return fmt.Errorf("cook is already deleted")
	}

	// Stop worker if running
	s.stopWorker(cookID)

	// Get orders assigned to this cook
	orders, err := s.orderRepo.GetByCookID(ctx, cookID)
	if err != nil {
		s.logger.Error("Failed to get orders for cook %d: %v", cookID, err)
		return fmt.Errorf("failed to get orders: %w", err)
	}

	// Return orders to queue front (PENDING or SERVING status)
	for _, order := range orders {
		if order.Status == domain.OrderStatusPending || order.Status == domain.OrderStatusServing {
			// Update order status back to PENDING
			if err := s.orderRepo.UpdateStatus(ctx, order.ID, domain.OrderStatusPending); err != nil {
				s.logger.Error("Failed to update order %d status: %v", order.ID, err)
				continue
			}

			// Unassign cook from order
			if err := s.orderRepo.UnassignCook(ctx, order.ID); err != nil {
				s.logger.Error("Failed to unassign cook from order %d: %v", order.ID, err)
				continue
			}

			// Re-enqueue at front of queue (#1 position)
			if err := s.orderQueue.EnqueueAtFront(order); err != nil {
				s.logger.Error("Failed to re-enqueue order %d: %v", order.ID, err)
				continue
			}

			s.logger.Info("Order %d returned to queue front after cook %d removal", order.ID, cookID)
		}
	}

	// Soft delete the cook
	if err := s.userRepo.SoftDelete(ctx, cookID); err != nil {
		s.logger.Error("Failed to soft delete cook %d: %v", cookID, err)
		return fmt.Errorf("failed to soft delete cook: %w", err)
	}

	s.logger.Info("Cook %s (ID: %d) removed - %d orders returned to queue", cook.Name, cookID, len(orders))
	return nil
}

// ReinstateCook reinstates a soft-deleted cook bot
// Time Complexity: O(1) for in-memory, O(log n) for database
func (s *cookService) ReinstateCook(ctx context.Context, cookID int) error {
	// Validate cook exists
	cook, err := s.userRepo.GetByID(ctx, cookID)
	if err != nil {
		s.logger.Error("Failed to get cook %d: %v", cookID, err)
		return fmt.Errorf("cook not found: %w", err)
	}

	if !cook.IsCook() {
		s.logger.Error("User %d is not a cook", cookID)
		return fmt.Errorf("user is not a cook")
	}

	if !cook.IsDeleted() {
		s.logger.Error("Cook %d is not deleted", cookID)
		return fmt.Errorf("cook is not deleted")
	}

	// Reinstate the cook
	if err := s.userRepo.Reinstate(ctx, cookID); err != nil {
		s.logger.Error("Failed to reinstate cook %d: %v", cookID, err)
		return fmt.Errorf("failed to reinstate cook: %w", err)
	}

	s.logger.Info("Cook %s (ID: %d) reinstated", cook.Name, cookID)
	return nil
}

// GetCook retrieves a cook by ID
// Time Complexity: O(1) for in-memory, O(log n) for database
func (s *cookService) GetCook(ctx context.Context, cookID int) (*domain.User, error) {
	cook, err := s.userRepo.GetByID(ctx, cookID)
	if err != nil {
		s.logger.Error("Failed to get cook %d: %v", cookID, err)
		return nil, err
	}

	if !cook.IsCook() {
		return nil, fmt.Errorf("user is not a cook")
	}

	return cook, nil
}

// GetAllCooks retrieves all cooks
// Time Complexity: O(n) - must scan all users
func (s *cookService) GetAllCooks(ctx context.Context, includeDeleted bool) ([]*domain.User, error) {
	cooks, err := s.userRepo.GetAllCooks(ctx, includeDeleted)
	if err != nil {
		s.logger.Error("Failed to get all cooks: %v", err)
		return nil, err
	}

	return cooks, nil
}

// AcceptOrder assigns an order from the queue to a cook and processes it
// Time Complexity: O(1) for queue dequeue + O(1) for order update
func (s *cookService) AcceptOrder(ctx context.Context, cookID int) (*domain.Order, error) {
	// Validate cook exists and is active
	cook, err := s.userRepo.GetByID(ctx, cookID)
	if err != nil {
		return nil, fmt.Errorf("cook not found: %w", err)
	}

	if !cook.IsCook() {
		return nil, fmt.Errorf("user is not a cook")
	}

	if cook.IsDeleted() {
		return nil, fmt.Errorf("cook is deleted")
	}

	// Dequeue order from priority queue
	order, err := s.orderQueue.Dequeue()
	if err != nil {
		if err == queue.ErrEmptyQueue {
			return nil, fmt.Errorf("no orders in queue")
		}
		return nil, fmt.Errorf("failed to dequeue order: %w", err)
	}

	// Assign cook to order
	if err := s.orderRepo.AssignCook(ctx, order.ID, cookID); err != nil {
		// Return order to queue if assignment fails
		_ = s.orderQueue.EnqueueAtFront(order)
		return nil, fmt.Errorf("failed to assign cook: %w", err)
	}

	// Update order status to SERVING
	if err := s.orderRepo.UpdateStatus(ctx, order.ID, domain.OrderStatusServing); err != nil {
		return nil, fmt.Errorf("failed to update order status: %w", err)
	}

	// Enhanced logging: Cook takes up an order
	s.logger.Info("Cook %s (ID: %d) TOOK ORDER %d - Queue size: %d",
		cook.Name, cookID, order.ID, s.orderQueue.Size())

	// Process order in background (simulate 10s cooking time)
	go s.processOrder(ctx, order.ID, cookID)

	return order, nil
}

// processOrder simulates order processing (SERVING -> COMPLETE after servingDuration)
// Time Complexity: O(1) - single order update after sleep
func (s *cookService) processOrder(ctx context.Context, orderID, cookID int) {
	// Record start time for processing duration calculation
	startTime := time.Now()

	// Simulate cooking time with context cancellation support
	select {
	case <-time.After(s.servingDuration):
		// Cooking completed normally
	case <-ctx.Done():
		// Context cancelled - order is abandoned
		processingTime := time.Since(startTime)
		s.logger.Info("Cook %d ABANDONED ORDER %d - Reason: Cancelled (%v) - Processing time: %v",
			cookID, orderID, ctx.Err(), processingTime.Round(time.Millisecond))
		return
	}

	// Update order status to COMPLETE
	if err := s.orderRepo.UpdateStatus(ctx, orderID, domain.OrderStatusComplete); err != nil {
		s.logger.Error("Failed to complete order %d: %v", orderID, err)
		return
	}

	// Calculate processing time
	processingTime := time.Since(startTime)

	// Enhanced logging: Cook completes an order with processing time
	s.logger.Info("Cook %d COMPLETED ORDER %d - Processing time: %v",
		cookID, orderID, processingTime.Round(time.Millisecond))
}

// StartWorkerPool starts N cook bot workers that continuously process orders
// Time Complexity: O(n) where n is number of cooks
func (s *cookService) StartWorkerPool(ctx context.Context, numCooks int) error {
	s.logger.Info("Starting worker pool with %d cook bots", numCooks)

	// Get all active cooks
	cooks, err := s.userRepo.GetAllCooks(ctx, false)
	if err != nil {
		return fmt.Errorf("failed to get cooks: %w", err)
	}

	// Start workers for each cook
	for _, cook := range cooks {
		if err := s.startWorker(ctx, cook.ID); err != nil {
			s.logger.Error("Failed to start worker for cook %d: %v", cook.ID, err)
		}
	}

	return nil
}

// startWorker starts a worker goroutine for a specific cook
func (s *cookService) startWorker(ctx context.Context, cookID int) error {
	s.workersMu.Lock()
	defer s.workersMu.Unlock()

	// Check if worker already exists
	if worker, exists := s.workers[cookID]; exists && worker.isRunning {
		return fmt.Errorf("worker already running for cook %d", cookID)
	}

	// Create worker
	worker := &cookWorker{
		cookID:    cookID,
		stopChan:  make(chan struct{}),
		isRunning: true,
	}
	s.workers[cookID] = worker

	// Start worker goroutine
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		s.logger.Info("Worker started for cook %d", cookID)

		ticker := time.NewTicker(100 * time.Millisecond)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				s.logger.Info("Worker stopped for cook %d (context cancelled)", cookID)
				return
			case <-worker.stopChan:
				s.logger.Info("Worker stopped for cook %d", cookID)
				return
			case <-s.stopChan:
				s.logger.Info("Worker stopped for cook %d (global stop)", cookID)
				return
			case <-ticker.C:
				// Try to accept an order
				_, err := s.AcceptOrder(ctx, cookID)
				if err != nil {
					// Continue to next iteration (ticker will wait 100ms)
					continue
				}
			}
		}
	}()

	return nil
}

// stopWorker stops a specific worker
func (s *cookService) stopWorker(cookID int) {
	s.workersMu.Lock()
	defer s.workersMu.Unlock()

	if worker, exists := s.workers[cookID]; exists && worker.isRunning {
		close(worker.stopChan)
		worker.isRunning = false
		s.logger.Info("Stopping worker for cook %d", cookID)
	}
}

// StopWorkerPool stops all workers gracefully
func (s *cookService) StopWorkerPool() {
	s.logger.Info("Stopping worker pool")
	close(s.stopChan)
	s.wg.Wait()
	s.logger.Info("Worker pool stopped")
}
