package err

import "errors"

var (
	ErrOrderPriorityInvalid error = errors.New("订单优先级错误")
)
