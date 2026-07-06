// Package ordercontroller 定义订单控制器的领域模型与业务规则。
// 本包不依赖任何外层（应用层/基础设施层），保持领域逻辑纯净可测。
package ordercontroller

// OrderType 表示订单优先级类型。
type OrderType string

const (
	OrderTypeNormal OrderType = "NORMAL" // 普通订单，排在所有 VIP 之后
	OrderTypeVIP    OrderType = "VIP"    // VIP 订单，优先于所有普通订单
)

// Order 是订单实体，通过单调递增的 ID 标识。
type Order struct {
	ID   int       // 全局唯一订单号，从 1 开始递增
	Type OrderType // 订单类型，决定排队优先级
}

// NewOrder 创建指定 ID 与类型的订单。
func NewOrder(id int, t OrderType) Order {
	return Order{ID: id, Type: t}
}
