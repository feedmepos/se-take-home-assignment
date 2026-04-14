package main

import (
	"context"
	"fmt"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/clock"
	"github.com/feedme/se-take-home-assignment/internal/domain"
	"github.com/feedme/se-take-home-assignment/internal/repository/memory"
	"github.com/feedme/se-take-home-assignment/internal/service"
)

func runDemo() {
	stamp := func() string { return time.Now().Format("15:04:05") }
	mem := memory.NewMemory()
	k := service.NewKitchen(mem, clock.RealClock{}, service.WithCookDuration(10*time.Millisecond))

	fmt.Printf("%s demo: new VIP order\n", stamp())
	if _, err := k.CreateOrder(context.Background(), domain.TierVIP); err != nil {
		panic(err)
	}
	fmt.Printf("%s demo: new normal order\n", stamp())
	if _, err := k.CreateOrder(context.Background(), domain.TierNormal); err != nil {
		panic(err)
	}
	fmt.Printf("%s demo: +Bot\n", stamp())
	if _, err := k.AddBot(context.Background()); err != nil {
		panic(err)
	}

	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		s, err := k.Snapshot(context.Background())
		if err != nil {
			panic(err)
		}
		if len(s.Complete) >= 2 {
			for _, o := range s.Complete {
				fmt.Printf("%s order %d complete (%s)\n", stamp(), o.ID, o.Tier)
			}
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	panic("demo timeout")
}
