package usecases

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
	"sort"
)

type StatusResult struct {
	PendingOrders    []*entities.Order
	ProcessingOrders []*ProcessingOrderInfo
	CompleteOrders   []*entities.Order
	Bots             []*BotInfo
	IdleBotCount     int
}

type ProcessingOrderInfo struct {
	Order *entities.Order
	BotID int
}

type BotInfo struct {
	ID             int
	IsProcessing   bool
	CurrentOrderID int
}

type GetStatusUseCase struct {
	orderRepo interfaces.OrderRepository
	botRepo   interfaces.BotRepository
}

func NewGetStatusUseCase(orderRepo interfaces.OrderRepository, botRepo interfaces.BotRepository) *GetStatusUseCase {
	return &GetStatusUseCase{
		orderRepo: orderRepo,
		botRepo:   botRepo,
	}
}

func (uc *GetStatusUseCase) Execute() *StatusResult {
	orders := uc.orderRepo.GetAllOrders()
	bots := uc.botRepo.GetAllBots()

	orderMap := buildOrderMap(orders)
	botInfos, idleCount, processingOrderIDs := buildBotInfoAndMetrics(bots, orderMap)
	pendingOrders, processingOrders, completeOrders := categorizeOrders(orders, processingOrderIDs)

	return &StatusResult{
		PendingOrders:    pendingOrders,
		ProcessingOrders: processingOrders,
		CompleteOrders:   completeOrders,
		Bots:             botInfos,
		IdleBotCount:     idleCount,
	}
}

func buildOrderMap(orders []*entities.Order) map[int]*entities.Order {
	orderMap := make(map[int]*entities.Order)
	for _, order := range orders {
		orderMap[order.ID] = order
	}
	return orderMap
}

func buildBotInfoAndMetrics(bots []*entities.Bot, orderMap map[int]*entities.Order) ([]*BotInfo, int, map[int]int) {
	botInfos := make([]*BotInfo, 0, len(bots))
	idleCount := 0
	processingOrderIDs := make(map[int]int) // orderID -> botID
	
	for _, bot := range bots {
		botInfos = append(botInfos, &BotInfo{
			ID:             bot.ID,
			IsProcessing:   bot.IsProcessing,
			CurrentOrderID: bot.CurrentOrderID,
		})
		if !bot.IsProcessing {
			idleCount++
		} else if bot.CurrentOrderID > 0 {
			if order, exists := orderMap[bot.CurrentOrderID]; exists && order.Status == entities.OrderStatusProcessing {
				processingOrderIDs[bot.CurrentOrderID] = bot.ID
			}
		}
	}

	return botInfos, idleCount, processingOrderIDs
}

func categorizeOrders(orders []*entities.Order, processingOrderIDs map[int]int) ([]*entities.Order, []*ProcessingOrderInfo, []*entities.Order) {
	pendingOrders := make([]*entities.Order, 0)
	completeOrders := make([]*entities.Order, 0)
	processingOrders := make([]*ProcessingOrderInfo, 0)

	for _, order := range orders {
		switch order.Status {
		case entities.OrderStatusComplete:
			completeOrders = append(completeOrders, order)
		case entities.OrderStatusProcessing:
			if botID, isProcessing := processingOrderIDs[order.ID]; isProcessing {
				processingOrders = append(processingOrders, &ProcessingOrderInfo{
					Order: order,
					BotID: botID,
				})
			} else {
				// Order is marked as PROCESSING but no bot is assigned - treat as pending
				pendingOrders = append(pendingOrders, order)
			}
		case entities.OrderStatusPending:
			pendingOrders = append(pendingOrders, order)
		}
	}

	// Sort pending orders: VIP first (maintaining FIFO within each type)
	sort.SliceStable(pendingOrders, func(i, j int) bool {
		if pendingOrders[i].Type == entities.OrderTypeVIP && pendingOrders[j].Type != entities.OrderTypeVIP {
			return true
		}
		return false
	})

	// Sort completed orders by completion time
	sort.Slice(completeOrders, func(i, j int) bool {
		if completeOrders[i].CompletedAt == nil {
			return false
		}
		if completeOrders[j].CompletedAt == nil {
			return true
		}
		return completeOrders[i].CompletedAt.Before(*completeOrders[j].CompletedAt)
	})

	return pendingOrders, processingOrders, completeOrders
}
