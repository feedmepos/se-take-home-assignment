package feedme

import "errors"

var (
	// ErrInvalidKind 表示订单 kind 非法。
	ErrInvalidKind = errors.New("invalid order kind")
	// ErrNoBot 表示当前没有可移除的机器人。
	ErrNoBot = errors.New("no bot to remove")
	// ErrInvalidBotAction 表示 bots 接口的 action 非法。
	ErrInvalidBotAction = errors.New("invalid bot action")
)
