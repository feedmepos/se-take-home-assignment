package dto

// CreateOrderRequest is the request model for Controller.CreateOrder. Type
// must be "normal" or "vip" (case-insensitive); any other value is
// rejected by the controller.
type CreateOrderRequest struct {
	Type string
}
