package cli

import (
	"context"
	"fmt"
	"io"
	"order-controller/internal/order"
	"time"

	"github.com/jonboulle/clockwork"
)

func RunDemo(output io.Writer) error {
	if _, err := fmt.Fprintln(output, "McDonald's Order Management System - Simulation Results"); err != nil {
		return err
	}
	if _, err := fmt.Fprintln(output); err != nil {
		return err
	}

	fakeClock := clockwork.NewFakeClockAt(time.Date(2026, 6, 3, 14, 32, 0, 0, time.Local))

	completedCh := make(chan struct{}, 10)
	afterFunc := func(d time.Duration, f func()) order.Timer {
		return fakeClock.AfterFunc(d, func() {
			f()
			completedCh <- struct{}{}
		})
	}

	ctx := context.Background()

	waitN := func(n int) {
		for range n {
			<-completedCh
		}
	}

	controller := order.NewControllerWithTimerAndClock(afterFunc, fakeClock.Now)
	controller.AddNormalOrder()
	controller.AddVIPOrder()
	controller.AddNormalOrder()
	controller.AddBot()
	controller.AddBot()
	controller.AddVIPOrder()

	if err := fakeClock.BlockUntilContext(ctx, 2); err != nil {
		return err
	}
	fakeClock.Advance(order.ProcessingDuration)
	waitN(2)

	if err := fakeClock.BlockUntilContext(ctx, 2); err != nil {
		return err
	}
	fakeClock.Advance(order.ProcessingDuration)
	waitN(2)

	controller.RemoveBot()

	if _, err := fmt.Fprintf(output, "\n%s\n", controller.FinalStatus()); err != nil {
		return err
	}

	return nil
}
