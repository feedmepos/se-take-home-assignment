package domain

import "time"

// StartProcessing pending -> processing；记录出队锚点供 RequeueToPending 使用。
func (o *Order) StartProcessing(botID BotID, pendingTier Tier, pendingIndex int) error {
	if o == nil {
		return ErrInvalidTransition
	}
	if o.Status != OrderPending {
		return ErrInvalidTransition
	}
	o.Status = OrderProcessing
	b := botID
	o.BotID = &b
	o.PendingTier = pendingTier
	o.PendingIndex = pendingIndex
	o.StartedAt = time.Now()
	return nil
}

// Complete processing -> complete。
func (o *Order) Complete() error {
	if o == nil {
		return ErrInvalidTransition
	}
	if o.Status != OrderProcessing {
		return ErrInvalidTransition
	}
	o.Status = OrderComplete
	o.BotID = nil
	o.CompletedAt = time.Now()
	return nil
}

// CancelProcessingToPending -Bot 中断：processing -> pending，保留 PendingTier/PendingIndex 供仓储回插。
func (o *Order) CancelProcessingToPending() error {
	if o == nil {
		return ErrInvalidTransition
	}
	if o.Status != OrderProcessing {
		return ErrInvalidTransition
	}
	o.Status = OrderPending
	o.BotID = nil
	o.StartedAt = time.Time{}
	return nil
}

// FailToException processing -> exception（不可恢复错误）。
func (o *Order) FailToException(kind ExceptionKind, code, message string) error {
	if o == nil {
		return ErrInvalidTransition
	}
	if o.Status != OrderProcessing {
		return ErrInvalidTransition
	}
	o.Status = OrderException
	o.BotID = nil
	o.Exception = kind
	o.ErrorCode = code
	o.ErrorMessage = message
	return nil
}

// RetryFromExceptionToPending 人工重试：exception -> pending（入队位置由仓储按「队尾」等规则处理）。
func (o *Order) RetryFromExceptionToPending() error {
	if o == nil {
		return ErrInvalidTransition
	}
	if o.Status != OrderException {
		return ErrInvalidTransition
	}
	o.Status = OrderPending
	o.Exception = ExceptionUnknown
	o.ErrorCode = ""
	o.ErrorMessage = ""
	o.BotID = nil
	o.CompletedAt = time.Time{}
	return nil
}
