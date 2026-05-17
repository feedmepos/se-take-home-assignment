package service

import (
	"context"
	"sort"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/domain"
)

// OrderDTO HTTP / 快照用。
type OrderDTO struct {
	ID            uint64  `json:"id"`
	Tier          string  `json:"tier"`
	Status        string  `json:"status"`
	AssignedBotID *uint64 `json:"assigned_bot_id,omitempty"`
	CreatedAt     string  `json:"created_at,omitempty"`
	StartedAt     string  `json:"started_at,omitempty"`
	CompletedAt   string  `json:"completed_at,omitempty"`
}

// BotDTO 机器人快照。
type BotDTO struct {
	ID    uint64 `json:"id"`
	State string `json:"state"` // idle | working
}

// Snapshot 聚合视图（DESIGN 2.1）。
type Snapshot struct {
	Pending    []OrderDTO `json:"pending"`
	Processing []OrderDTO `json:"processing"`
	Complete   []OrderDTO `json:"complete"`
	Exception  []OrderDTO `json:"exception"`
	Bots       []BotDTO   `json:"bots"`
}

func tierString(t domain.Tier) string {
	if t == domain.TierVIP {
		return "vip"
	}
	return "normal"
}

func statusString(s domain.OrderStatus) string {
	switch s {
	case domain.OrderPending:
		return "pending"
	case domain.OrderProcessing:
		return "processing"
	case domain.OrderComplete:
		return "complete"
	case domain.OrderException:
		return "exception"
	default:
		return "unknown"
	}
}

func orderToDTO(o *domain.Order) OrderDTO {
	d := OrderDTO{
		ID:     uint64(o.ID),
		Tier:   tierString(o.Tier),
		Status: statusString(o.Status),
	}
	if o.BotID != nil {
		b := uint64(*o.BotID)
		d.AssignedBotID = &b
	}
	if !o.CreatedAt.IsZero() {
		d.CreatedAt = o.CreatedAt.UTC().Format(time.RFC3339Nano)
	}
	if !o.StartedAt.IsZero() {
		d.StartedAt = o.StartedAt.UTC().Format(time.RFC3339Nano)
	}
	if !o.CompletedAt.IsZero() {
		d.CompletedAt = o.CompletedAt.UTC().Format(time.RFC3339Nano)
	}
	return d
}

func dtoOrders(orders []*domain.Order) []OrderDTO {
	out := make([]OrderDTO, 0, len(orders))
	for _, o := range orders {
		if o != nil {
			out = append(out, orderToDTO(o))
		}
	}
	return out
}

// Snapshot 构建当前厨房视图。
func (k *Kitchen) Snapshot(ctx context.Context) (*Snapshot, error) {
	_ = ctx
	k.mu.Lock()
	botIDs := make([]domain.BotID, len(k.bots))
	for i, h := range k.bots {
		botIDs[i] = h.id
	}
	k.mu.Unlock()

	pending := k.mem.ListByStatus(domain.OrderPending)
	processing := k.mem.ListByStatus(domain.OrderProcessing)
	complete := k.mem.ListByStatus(domain.OrderComplete)
	exception := k.mem.ListByStatus(domain.OrderException)

	bots := make([]BotDTO, 0, len(botIDs))
	for _, bid := range botIDs {
		st := "idle"
		for _, o := range processing {
			if o.BotID != nil && *o.BotID == bid {
				st = "working"
				break
			}
		}
		bots = append(bots, BotDTO{ID: uint64(bid), State: st})
	}
	sort.Slice(bots, func(i, j int) bool { return bots[i].ID < bots[j].ID })
	return &Snapshot{
		Pending:    dtoOrders(pending),
		Processing: dtoOrders(processing),
		Complete:   dtoOrders(complete),
		Exception:  dtoOrders(exception),
		Bots:       bots,
	}, nil
}
