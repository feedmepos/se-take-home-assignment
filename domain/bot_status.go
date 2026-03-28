package domain

type BotStatus int

const (
	Idle       BotStatus = 0
	Processing BotStatus = 1
)

func (bs BotStatus) String() string {
	switch bs {
	case Idle:
		return "Idle"
	case Processing:
		return "Processing"
	default:
		return "Unknown"
	}
}

func (bs BotStatus) IsIdle() bool {
	return bs == Idle
}

func (bs BotStatus) IsProcessing() bool {
	return bs == Processing
}
