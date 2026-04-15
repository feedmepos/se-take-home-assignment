package mcdonald

type Bot struct {
	ID           int
	IsProcessing bool
	CurrentOrder *Order
	StopChannel  chan bool
}
