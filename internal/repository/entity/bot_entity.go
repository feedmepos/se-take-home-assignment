package entity

// BotEntity is the in-memory registry record for a bot.
//
// Ref holds the live *core.Bot reference as an opaque value (any) so this
// package stays core-agnostic; the repository that owns the registry is
// responsible for asserting it back to *core.Bot when needed.
type BotEntity struct {
	ID  int
	Ref any
}
