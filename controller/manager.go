package controller

import (
	"context"

	"idreamshen.com/fmcode/service"
)

func AddBot(ctx context.Context) error {
	return service.GetBotService().Add(ctx)
}

func DecrBot(ctx context.Context) error {
	return service.GetBotService().Decr(ctx)
}
