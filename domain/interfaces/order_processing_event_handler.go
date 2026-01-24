package interfaces

import "feedme-takehome/domain/entities"

type OrderProcessingEventHandler interface {
	OnOrderPickedUp(botID int, order *entities.Order)
	OnOrderCompleted(botID int, order *entities.Order)
	OnOrderInterrupted(orderID int)
}
