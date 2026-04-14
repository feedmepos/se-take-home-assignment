package domain

import "errors"

var ErrInvalidTransition = errors.New("domain: invalid status transition")
