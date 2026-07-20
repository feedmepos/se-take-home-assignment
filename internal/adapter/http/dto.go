// Package http is the REST delivery adapter. It maps use-case types to the
// JSON contract the React frontend depends on verbatim.
package http

import (
	"time"

	"github.com/KhanitthaK/feedme-backend-service/internal/domain"
	"github.com/KhanitthaK/feedme-backend-service/internal/usecase"
)

// OrderDTO is the JSON shape of an order. Enums are UPPERCASE strings and
// timestamps are RFC3339 (UTC, "Z").
type OrderDTO struct {
	ID          int     `json:"id"`
	Type        string  `json:"type"`
	Status      string  `json:"status"`
	CreatedAt   string  `json:"createdAt"`
	CompletedAt *string `json:"completedAt"`
}

func toOrderDTO(o domain.Order) OrderDTO {
	dto := OrderDTO{
		ID:        o.ID,
		Type:      string(o.Type),
		Status:    string(o.Status),
		CreatedAt: o.CreatedAt.UTC().Format(time.RFC3339),
	}
	if o.CompletedAt != nil {
		s := o.CompletedAt.UTC().Format(time.RFC3339)
		dto.CompletedAt = &s
	}
	return dto
}

func toOrderDTOs(os []domain.Order) []OrderDTO {
	out := make([]OrderDTO, 0, len(os)) // non-nil so JSON is [] not null
	for _, o := range os {
		out = append(out, toOrderDTO(o))
	}
	return out
}

// BotDTO is the JSON shape of a bot. currentOrderId and remainingSeconds are
// null when the bot is IDLE.
type BotDTO struct {
	ID               int    `json:"id"`
	Status           string `json:"status"`
	CurrentOrderID   *int   `json:"currentOrderId"`
	RemainingSeconds *int   `json:"remainingSeconds"`
}

func botDTOFromDomain(b domain.Bot) BotDTO {
	return BotDTO{
		ID:             b.ID,
		Status:         string(b.Status),
		CurrentOrderID: b.CurrentOrderID,
	}
}

func toBotDTOs(bots []usecase.BotView) []BotDTO {
	out := make([]BotDTO, 0, len(bots))
	for _, b := range bots {
		out = append(out, BotDTO{
			ID:               b.Bot.ID,
			Status:           string(b.Bot.Status),
			CurrentOrderID:   b.Bot.CurrentOrderID,
			RemainingSeconds: b.RemainingSeconds,
		})
	}
	return out
}

// StateDTO is the JSON shape returned by GET /api/state.
type StateDTO struct {
	Pending    []OrderDTO `json:"pending"`
	Processing []OrderDTO `json:"processing"`
	Complete   []OrderDTO `json:"complete"`
	Bots       []BotDTO   `json:"bots"`
}

func toStateDTO(s usecase.StateSnapshot) StateDTO {
	return StateDTO{
		Pending:    toOrderDTOs(s.Pending),
		Processing: toOrderDTOs(s.Processing),
		Complete:   toOrderDTOs(s.Complete),
		Bots:       toBotDTOs(s.Bots),
	}
}
