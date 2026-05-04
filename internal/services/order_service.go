package services

import (
	"database/sql"
	"order-controller/internal/db"
	"time"
)

type OrderType string

const (
	OrderTypeNormal OrderType = "NORMAL"
	OrderTypeVIP    OrderType = "VIP"
)

type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "PENDING"
	OrderStatusProcessing OrderStatus = "PROCESSING"
	OrderStatusComplete   OrderStatus = "COMPLETE"
)

type Order struct {
	ID        int
	Type      OrderType
	Status    OrderStatus
	CreatedAt time.Time
}

type OrderService struct {
	db *db.Database
}

func NewOrderService(database *db.Database) *OrderService {
	return &OrderService{db: database}
}

func (s *OrderService) CreateOrder(orderType OrderType) error {
	_, err := s.db.Exec(
		"INSERT INTO orders (order_type, status) VALUES (?, ?)",
		orderType, OrderStatusPending,
	)
	return err
}

func (s *OrderService) GetOrder(id int) *Order {
	order := &Order{}
	err := s.db.QueryRow(
		"SELECT id, order_type, status, created_at FROM orders WHERE id = ?",
		id,
	).Scan(&order.ID, &order.Type, &order.Status, &order.CreatedAt)
	if err != nil {
		return nil
	}
	return order
}

func (s *OrderService) GetPendingOrders() []*Order {
	rows, err := s.db.Query(`
		SELECT id, order_type, status, created_at
		FROM orders
		WHERE status = ?
		ORDER BY
			CASE WHEN order_type = 'VIP' THEN 0 ELSE 1 END,
			id ASC
	`, OrderStatusPending)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var orders []*Order
	for rows.Next() {
		order := &Order{}
		if err := rows.Scan(&order.ID, &order.Type, &order.Status, &order.CreatedAt); err != nil {
			return nil
		}
		orders = append(orders, order)
	}
	return orders
}

func (s *OrderService) GetNextPendingOrder() *Order {
	order := &Order{}
	err := s.db.QueryRow(`
		SELECT id, order_type, status, created_at
		FROM orders
		WHERE status = ?
		ORDER BY
			CASE WHEN order_type = 'VIP' THEN 0 ELSE 1 END,
			id ASC
		LIMIT 1
	`, OrderStatusPending).Scan(&order.ID, &order.Type, &order.Status, &order.CreatedAt)
	if err == sql.ErrNoRows || err != nil {
		return nil
	}
	return order
}

func (s *OrderService) UpdateOrderStatus(id int, status OrderStatus) {
	s.db.Exec("UPDATE orders SET status = ? WHERE id = ?", status, id)
}

func (s *OrderService) GetCompletedOrders() []*Order {
	rows, err := s.db.Query(`
		SELECT id, order_type, status, created_at
		FROM orders
		WHERE status = ?
		ORDER BY id ASC
	`, OrderStatusComplete)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var orders []*Order
	for rows.Next() {
		order := &Order{}
		if err := rows.Scan(&order.ID, &order.Type, &order.Status, &order.CreatedAt); err != nil {
			return nil
		}
		orders = append(orders, order)
	}
	return orders
}

func (s *OrderService) GetAllOrders() []*Order {
	rows, err := s.db.Query(`
		SELECT id, order_type, status, created_at
		FROM orders
		ORDER BY id ASC
	`)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var orders []*Order
	for rows.Next() {
		order := &Order{}
		if err := rows.Scan(&order.ID, &order.Type, &order.Status, &order.CreatedAt); err != nil {
			return nil
		}
		orders = append(orders, order)
	}
	return orders
}
