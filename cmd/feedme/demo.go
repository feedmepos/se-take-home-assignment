package main

import (
	"fmt"
	"time"

	"github.com/hanxipu/se-take-home-assignment/internal/feedme"
)

func ts() string {
	return time.Now().Format("15:04:05")
}

func runDemo() {
	defaultDur := 10 * time.Second
	dur := feedme.ProcessDurationFromEnv(defaultDur)
	if feedme.DemoFastEnabled() {
		// CI：缩短 wall-clock；仍可通过 FEEDME_PROCESS_MS 覆盖毫秒数
		dur = feedme.ProcessDurationFromEnv(50 * time.Millisecond)
	}

	e := feedme.NewEngine(dur)
	logf := func(format string, args ...interface{}) {
		fmt.Printf("[%s] %s\n", ts(), fmt.Sprintf(format, args...))
	}

	logf("demo start, process duration=%v", dur)

	id1, _ := e.AddOrder(feedme.KindNormal)
	logf("new normal order id=%d", id1)
	id2, _ := e.AddOrder(feedme.KindVIP)
	logf("new VIP order id=%d", id2)

	e.AddBot()
	logf("add bot, snapshot pending VIP before normal")
	printSnapshot(logf, e)

	time.Sleep(dur + dur/5)
	logf("after first completion window")
	printSnapshot(logf, e)

	time.Sleep(dur + dur/5)
	logf("after second completion window")
	printSnapshot(logf, e)

	e.AddOrder(feedme.KindNormal)
	id4, _ := e.AddOrder(feedme.KindNormal)
	logf("added normal orders, last id=%d", id4)
	e.AddBot()
	logf("add second bot")
	time.Sleep(dur + dur/5)
	printSnapshot(logf, e)

	if err := e.RemoveNewestBot(); err != nil {
		logf("remove newest bot: %v", err)
	} else {
		logf("removed newest bot")
	}
	printSnapshot(logf, e)

	logf("demo finished")
}

func printSnapshot(logf func(string, ...interface{}), e *feedme.Engine) {
	st := e.Snapshot()
	logf("state pending=%d processing=%d complete=%d bots=%d",
		len(st.Pending), len(st.Processing), len(st.Complete), len(st.Bots))
	for _, b := range st.Bots {
		if b.Idle {
			logf("  bot id=%d IDLE", b.ID)
		} else {
			logf("  bot id=%d Processing orderId=%d", b.ID, b.OrderID)
		}
	}
}
