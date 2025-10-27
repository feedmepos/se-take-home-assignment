package queue

import "errors"

var (
	// ErrEmptyQueue is returned when attempting to dequeue from an empty queue
	ErrEmptyQueue = errors.New("queue is empty")

	// ErrNilOrder is returned when attempting to enqueue a nil order
	ErrNilOrder = errors.New("cannot enqueue nil order")
)
