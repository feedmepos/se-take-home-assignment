package models

import (
	"container/list"
	"context"
	"sync"

	"idreamshen.com/fmcode/consts"
)

type Bot struct {
	ID      int64            // 机器人 ID
	Status  consts.BotStatus // 状态
	OrderID int64            // 订单 ID

	mutex sync.Mutex

	E *list.Element

	CancelCtx  context.Context
	CancelFunc context.CancelFunc
}

func (b *Bot) Lock() {
	b.mutex.Lock()
}

func (b *Bot) Unlock() {
	b.mutex.Unlock()
}
