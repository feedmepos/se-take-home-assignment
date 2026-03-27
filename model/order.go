package model

type Order struct {
	ID        int     `json:"id"`
	OrderNo   string  `json:"order_no"`
	UserID    int     `json:"user_id"`
	ShopID    int     `json:"shop_id"`
	Amount    float64 `json:"amount"`
	CreatedAt string  `json:"created_at"`
	VIP       bool    `json:"vip"`
	// "pending" or "finished"
	Status    string  `json:"status"`
}
