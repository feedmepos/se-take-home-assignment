package simulation

import (
	"feedme-takehome/domain/interfaces"
	"feedme-takehome/presentation"
	"time"
)

// BasicOrderFlow tests: Normal order to PENDING, bot processes in 10s, order moves to COMPLETE
func BasicOrderFlow(cli *presentation.CLI, output interfaces.OutputWriter) {
	cli.NewNormalOrder()
	time.Sleep(100 * time.Millisecond)

	cli.AddBot()
	time.Sleep(100 * time.Millisecond)

	time.Sleep(12 * time.Second)

	cli.PrintStatus()
	time.Sleep(1 * time.Second)

	output.WriteLine("")
	output.WriteLine("----------------------------------------")
	output.WriteLine("")
}

// VIPPriority tests: VIP orders placed ahead of normal orders, processed first
func VIPPriority(cli *presentation.CLI, output interfaces.OutputWriter) {
	cli.NewNormalOrder()
	time.Sleep(100 * time.Millisecond)

	cli.NewNormalOrder()
	time.Sleep(100 * time.Millisecond)

	cli.NewVIPOrder()
	time.Sleep(100 * time.Millisecond)

	cli.AddBot()
	time.Sleep(100 * time.Millisecond)

	time.Sleep(12 * time.Second)

	cli.PrintStatus()
	time.Sleep(1 * time.Second)

	output.WriteLine("")
	output.WriteLine("----------------------------------------")
	output.WriteLine("")
}

// BotRemovalMidProcessing tests: Removing bot returns order to PENDING
func BotRemovalMidProcessing(cli *presentation.CLI, output interfaces.OutputWriter) {
	cli.NewNormalOrder()
	time.Sleep(100 * time.Millisecond)

	cli.NewNormalOrder()
	time.Sleep(100 * time.Millisecond)

	cli.AddBot()
	time.Sleep(100 * time.Millisecond)

	time.Sleep(2 * time.Second)

	cli.RemoveBot()
	time.Sleep(100 * time.Millisecond)

	cli.PrintStatus()
	time.Sleep(1 * time.Second)

	output.WriteLine("")
	output.WriteLine("----------------------------------------")
	output.WriteLine("")
}

// MultipleVIPOrdering tests: VIP orders queue behind existing VIP but ahead of normal
func MultipleVIPOrdering(cli *presentation.CLI, output interfaces.OutputWriter) {
	cli.NewNormalOrder()
	time.Sleep(100 * time.Millisecond)

	cli.NewVIPOrder()
	time.Sleep(100 * time.Millisecond)

	cli.NewNormalOrder()
	time.Sleep(100 * time.Millisecond)

	cli.NewVIPOrder()
	time.Sleep(100 * time.Millisecond)

	cli.PrintStatus()
	time.Sleep(1 * time.Second)

	output.WriteLine("")
	output.WriteLine("----------------------------------------")
	output.WriteLine("")
}

// BotIdleBehavior tests: Bot becomes idle when no orders, picks up new orders automatically
func BotIdleBehavior(cli *presentation.CLI, output interfaces.OutputWriter) {
	cli.AddBot()
	time.Sleep(100 * time.Millisecond)

	time.Sleep(2 * time.Second)

	cli.NewNormalOrder()
	time.Sleep(100 * time.Millisecond)

	time.Sleep(12 * time.Second)

	cli.PrintStatus()
}
