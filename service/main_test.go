package service

import (
	"os"
	"testing"

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
}

func teardown() {

}
