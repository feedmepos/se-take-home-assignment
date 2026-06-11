package order

import (
	"fmt"
	"io"
	"time"
)

func RunDemo(w io.Writer) {
	r := NewRecorder(w)
	demoDuration := 2 * time.Second
	c := NewController(WithDuration(demoDuration), WithRecorder(r))

	fmt.Fprintln(w, "=== McDonald's Order Controller Demo ===")
	fmt.Fprintln(w, "")

	done := make(chan struct{})
	go func() {
		tk := time.NewTicker(100 * time.Millisecond)
		defer tk.Stop()
		for {
			select {
			case <-tk.C:
				c.ProcessCompleted()
			case <-done:
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

	time.Sleep(demoDuration + 500*time.Millisecond)
	close(done)

	r.WriteSummary()
	fmt.Fprintln(w, "=== Demo Complete ===")
}
