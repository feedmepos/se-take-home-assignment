package view

type ScreenView struct {
	Uncompleted []int64 `json:"uncompleted"`
	Completed   []int64 `json:"completed"`
}
