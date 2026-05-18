package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/hanxipu/se-take-home-assignment/internal/feedme"
)

func runInteractive() {
	dur := feedme.ProcessDurationFromEnv(10 * time.Second)
	e := feedme.NewEngine(dur)
	fmt.Println("FeedMe interactive — commands: n v + - s q | help")
	sc := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("feedme> ")
		if !sc.Scan() {
			break
		}
		line := strings.TrimSpace(sc.Text())
		if line == "" {
			continue
		}
		switch line {
		case "q", "quit":
			fmt.Println("bye")
			return
		case "help", "?":
			fmt.Println("n: New Normal Order")
			fmt.Println("v: New VIP Order")
			fmt.Println("+: Add Bot")
			fmt.Println("-: Remove newest Bot")
			fmt.Println("s: Show state")
			fmt.Println("q: Quit")
		case "n":
			id, err := e.AddOrder(feedme.KindNormal)
			if err != nil {
				fmt.Println("error:", err)
				continue
			}
			fmt.Printf("[%s] created normal order id=%d\n", ts(), id)
		case "v":
			id, err := e.AddOrder(feedme.KindVIP)
			if err != nil {
				fmt.Println("error:", err)
				continue
			}
			fmt.Printf("[%s] created VIP order id=%d\n", ts(), id)
		case "+":
			id := e.AddBot()
			fmt.Printf("[%s] added bot id=%d\n", ts(), id)
		case "-":
			if err := e.RemoveNewestBot(); err != nil {
				fmt.Println("error:", err)
				continue
			}
			fmt.Printf("[%s] removed newest bot\n", ts())
		case "s":
			printInteractiveState(e)
		default:
			fmt.Println("unknown command, type help")
		}
	}
	if err := sc.Err(); err != nil {
		fmt.Fprintln(os.Stderr, "stdin:", err)
	}
}

func printInteractiveState(e *feedme.Engine) {
	st := e.Snapshot()
	fmt.Printf("[%s] PENDING: ", ts())
	for _, o := range st.Pending {
		fmt.Printf("#%d(%s) ", o.ID, o.Kind)
	}
	fmt.Println()
	fmt.Printf("[%s] PROCESSING: ", ts())
	for _, o := range st.Processing {
		fmt.Printf("#%d(%s) ", o.ID, o.Kind)
	}
	fmt.Println()
	fmt.Printf("[%s] COMPLETE: ", ts())
	for _, o := range st.Complete {
		fmt.Printf("#%d ", o.ID)
	}
	fmt.Println()
	fmt.Printf("[%s] BOTS: ", ts())
	for _, b := range st.Bots {
		if b.Idle {
			fmt.Printf("id=%d IDLE ", b.ID)
		} else {
			fmt.Printf("id=%d order=%d ", b.ID, b.OrderID)
		}
	}
	fmt.Println()
}
