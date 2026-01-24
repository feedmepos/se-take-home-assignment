package models

import (
	"feedme-takehome/domain/entities"
	"time"
)

type OrderModel struct {
	ID                  int
	Type                string
	CreatedAt           time.Time
	ProcessingStartedAt *time.Time
	CompletedAt         *time.Time
	Status              string
}

func (m *OrderModel) ToEntity() *entities.Order {
	return &entities.Order{
		ID:                  m.ID,
		Type:                entities.OrderType(m.Type),
		CreatedAt:           m.CreatedAt,
		ProcessingStartedAt: m.ProcessingStartedAt,
		CompletedAt:         m.CompletedAt,
		Status:              entities.OrderStatus(m.Status),
	}
}

func OrderModelFromEntity(order *entities.Order) *OrderModel {
	return &OrderModel{
		ID:                  order.ID,
		Type:                string(order.Type),
		CreatedAt:           order.CreatedAt,
		ProcessingStartedAt: order.ProcessingStartedAt,
		CompletedAt:         order.CompletedAt,
		Status:              string(order.Status),
	}
}
