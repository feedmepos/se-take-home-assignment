package view

type ScreenView struct {
	Uncompleted []int64 `json:"PENDING"`
	Completed   []int64 `json:"COMPLETE"`
}

type CreateOrderView struct {
	OrderID int64
}
