package mcdonald_test

import (
	"feedme/mcdonald"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewMcDonald(t *testing.T) {
	t.Run("should create a new McDonald instance", func(t *testing.T) {
		mcd := mcdonald.New()

		assert.NotNil(t, mcd)
	})
}
