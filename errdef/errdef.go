package errdef

import "errors"

var (
	ErrOrderPriorityInvalid error = errors.New("订单优先级错误")
	ErrOrderStatusNotMatch  error = errors.New("订单状态不匹配")
	ErrOrderNotFound        error = errors.New("订单不存在")

	ErrBotNotFound         error = errors.New("机器人不存在")
	ErrBotStatusNotIdle    error = errors.New("机器人状态非空闲中")
	ErrBotStatusNotCooking error = errors.New("机器人状态非制餐中")
)
