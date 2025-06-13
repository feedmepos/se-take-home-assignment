package listener

import (
	"os"
	"testing"
	"time"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/eventbus"
)

func TestMain(m *testing.M) {
	setup()
	code := m.Run()
	teardown()
	os.Exit(code)
}

func setup() {
	eventbus.InitEventBus()
	consts.OrderCookTime = time.Second
}

func teardown() {

}
