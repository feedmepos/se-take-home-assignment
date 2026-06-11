package order

import (
	"context"
	"fmt"
	"io"
	"time"
)

// RunDemo executes a predefined scenario demonstrating all order controller
// features and writes the output to the given writer.
func RunDemo(w io.Writer) {
	r := NewRecorder(w)
	demoDuration := 2 * time.Second
	c := NewController(WithDuration(demoDuration), WithRecorder(r))

	fmt.Fprintln(w, "=== McDonald's Order Controller Demo ===")
	fmt.Fprintln(w, "")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() {
		tk := time.NewTicker(100 * time.Millisecond)
		defer tk.Stop()
		for {
			select {
			case <-tk.C:
				c.ProcessCompleted()
			case <-ctx.Done():
				c.ProcessCompleted()
				return
			}
		}
	}()

	c.NewOrder(OrderNormal)
	c.NewOrder(OrderNormal)
	c.NewOrder(OrderVIP)
	c.NewOrder(OrderVIP)

	time.Sleep(200 * time.Millisecond)
	c.AddBot()
	c.AddBot()
	c.AddBot()

	time.Sleep(100 * time.Millisecond)
	c.RemoveBot()

	time.Sleep(demoDuration + 500*time.Millisecond)
	c.NewOrder(OrderNormal)

	time.Sleep(4 * time.Second)
	cancel()

	r.WriteSummary()
	fmt.Fprintln(w, "=== Demo Complete ===")
}
