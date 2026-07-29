package api

import (
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
	"github.com/Splinglove/se-take-home-assignment/internal/order"
)

type OrderDTO struct {
	ID     int    `json:"id"`
	Type   string `json:"type"`
	Status string `json:"status"`
}

type BotDTO struct {
	ID             int    `json:"id"`
	Status         string `json:"status"`
	CurrentOrderID *int   `json:"currentOrderId"`
}

type State struct {
	Pending    []OrderDTO `json:"pending"`
	Processing []OrderDTO `json:"processing"`
	Complete   []OrderDTO `json:"complete"`
	Bots       []BotDTO   `json:"bots"`
}

func BuildState(snap controller.Snapshot) State {
	st := State{
		Pending:    make([]OrderDTO, 0, len(snap.Pending)),
		Processing: make([]OrderDTO, 0),
		Complete:   make([]OrderDTO, 0, len(snap.Complete)),
		Bots:       make([]BotDTO, 0, len(snap.Bots)),
	}
	for _, o := range snap.Pending {
		st.Pending = append(st.Pending, toOrderDTO(o))
	}
	for _, o := range snap.Complete {
		st.Complete = append(st.Complete, toOrderDTO(o))
	}
	for _, b := range snap.Bots {
		bd := BotDTO{ID: b.ID, Status: string(b.Status)}
		if b.CurrentOrder != nil {
			id := b.CurrentOrder.ID
			bd.CurrentOrderID = &id
			if b.CurrentOrder.Status == order.StatusProcessing {
				st.Processing = append(st.Processing, toOrderDTO(b.CurrentOrder))
			}
		}
		st.Bots = append(st.Bots, bd)
	}
	return st
}

func toOrderDTO(o *order.Order) OrderDTO {
	return OrderDTO{ID: o.ID, Type: string(o.Type), Status: string(o.Status)}
}
