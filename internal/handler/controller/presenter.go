package controller

import (
	"fmt"
	"io"

	"feedme-order-controller/internal/handler/dto"
	"feedme-order-controller/internal/usecase/core"
)

// toOrderView maps a single core.Order into its presentation model, as
// returned by Controller.CreateOrder.
func toOrderView(o core.Order) dto.OrderView {
	return dto.OrderView{
		ID:     o.ID,
		Type:   o.Kind.String(),
		Status: o.Status.String(),
	}
}

// toBotView maps a single *core.Bot into its presentation model, as
// returned by Controller.AddBot/RemoveBot. Unlike toStatusResponse's
// per-bot mapping (which reads from a core.BotSnapshot already captured in
// a core.Summary), this reads live off the bot itself.
func toBotView(b *core.Bot) dto.BotView {
	v := dto.BotView{
		ID:     b.ID,
		Status: b.Status().String(),
	}
	if cur := b.Current(); cur != nil {
		v.ProcessingOrderID = cur.ID
	}
	return v
}

// toStatusResponse maps a core.Summary snapshot into the presentation model
// rendered by the "status" query: the pending queue and bot states, plus a
// running completed count.
func toStatusResponse(s core.Summary) dto.StatusResponse {
	pending := make([]dto.OrderView, 0, len(s.Pending))
	for _, o := range s.Pending {
		pending = append(pending, dto.OrderView{
			ID:     o.ID,
			Type:   o.Kind.String(),
			Status: o.Status.String(),
		})
	}

	bots := make([]dto.BotView, 0, len(s.Bots))
	for _, b := range s.Bots {
		bots = append(bots, dto.BotView{
			ID:                b.ID,
			Status:            b.Status.String(),
			ProcessingOrderID: b.ProcessingOrderID,
		})
	}

	return dto.StatusResponse{
		Pending:        pending,
		Bots:           bots,
		CompletedCount: s.CompletedOrders,
	}
}

// toSummaryResponse maps a core.Summary snapshot into the compact
// counters-only view rendered at shutdown.
func toSummaryResponse(s core.Summary) dto.SummaryResponse {
	return dto.SummaryResponse{
		ActiveBots:      s.ActiveBots,
		PendingOrders:   s.PendingOrders,
		CompletedOrders: s.CompletedOrders,
		VIPCompleted:    s.VIPCompleted,
		NormalCompleted: s.NormalCompleted,
	}
}

// renderStatus writes the current pending queue, bot states, and completed
// count to w. It is used by the "status" REPL command and by the demo
// scenario to show queue state at key points. It renders directly from the
// dto.StatusResponse returned by Controller.GetStatus.
func renderStatus(w io.Writer, sr dto.StatusResponse) {
	fmt.Fprintln(w, "Status:")

	if len(sr.Pending) == 0 {
		fmt.Fprintln(w, "- Pending Orders: none")
	} else {
		fmt.Fprintln(w, "- Pending Orders:")
		for _, o := range sr.Pending {
			fmt.Fprintf(w, "  - #%d (%s) - %s\n", o.ID, o.Type, o.Status)
		}
	}

	if len(sr.Bots) == 0 {
		fmt.Fprintln(w, "- Bots: none")
	} else {
		fmt.Fprintln(w, "- Bots:")
		for _, b := range sr.Bots {
			if b.ProcessingOrderID != 0 {
				fmt.Fprintf(w, "  - Bot #%d - %s (Order #%d)\n", b.ID, b.Status, b.ProcessingOrderID)
			} else {
				fmt.Fprintf(w, "  - Bot #%d - %s\n", b.ID, b.Status)
			}
		}
	}

	fmt.Fprintf(w, "- Completed Orders: %d\n", sr.CompletedCount)
}

// renderFinalSummary writes the closing summary block shown once the
// controller shuts down (REPL exit or end of the demo scenario). It
// renders directly from the dto.SummaryResponse returned by
// Controller.Shutdown.
func renderFinalSummary(w io.Writer, sr dto.SummaryResponse) {
	total := sr.CompletedOrders + sr.PendingOrders

	fmt.Fprintln(w, "Final Status:")
	fmt.Fprintf(w, "- Total Orders: %d\n", total)
	fmt.Fprintf(w, "- Orders Completed: %d (%d VIP, %d Normal)\n", sr.CompletedOrders, sr.VIPCompleted, sr.NormalCompleted)
	fmt.Fprintf(w, "- Pending Orders: %d\n", sr.PendingOrders)
	fmt.Fprintf(w, "- Active Bots: %d\n", sr.ActiveBots)
}
