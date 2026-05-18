package feedme

// 以下为领域类型；JSON/API 使用小写字符串与文档一致。

type OrderKind string

const (
	KindNormal OrderKind = "normal"
	KindVIP    OrderKind = "vip"
)

type OrderStatus string

const (
	StatusPending    OrderStatus = "pending"
	StatusProcessing OrderStatus = "processing"
	StatusComplete   OrderStatus = "complete"
)

// Order 表示一笔订单。
type Order struct {
	ID     int64       `json:"id"`
	Kind   OrderKind   `json:"kind"`
	Status OrderStatus `json:"status"`
}

// BotSnapshot 为对外快照中的机器人状态。
type BotSnapshot struct {
	ID      int64 `json:"id"`
	Idle    bool  `json:"idle"`
	OrderID int64 `json:"orderId,omitempty"`
}

// State 为 GET /api/state 的快照。
type State struct {
	Pending    []Order       `json:"pending"`
	Processing []Order       `json:"processing"`
	Complete   []Order       `json:"complete"`
	Bots       []BotSnapshot `json:"bots"`
}
