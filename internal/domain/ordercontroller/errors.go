package ordercontroller

import "errors"

// ErrNoBot 表示当前没有可移除的 Bot（-bot 在无 Bot 时调用）。
var ErrNoBot = errors.New("no bot to remove")
