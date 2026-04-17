package protocol

const (
	CommandPrefix = "$"
	CommentPrefix = "#"

	CommandOrder  = CommandPrefix + "order"
	CommandBot    = CommandPrefix + "bot"
	CommandTick   = CommandPrefix + "tick"
	CommandStatus = CommandPrefix + "status"
	CommandHelp   = CommandPrefix + "help"
	CommandExit   = CommandPrefix + "exit"

	ArgumentNormal = "normal"
	ArgumentVIP    = "vip"
	ArgumentAdd    = "add"
	ArgumentRemove = "remove"

	FullCommandOrderNormal = CommandOrder + " " + ArgumentNormal
	FullCommandOrderVIP    = CommandOrder + " " + ArgumentVIP
	FullCommandBotAdd      = CommandBot + " " + ArgumentAdd
	FullCommandBotRemove   = CommandBot + " " + ArgumentRemove
	FullCommandTick        = CommandTick + " <duration>"
)
