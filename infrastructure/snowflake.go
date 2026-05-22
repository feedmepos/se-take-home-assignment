package infrastructure

import (
	"errors"
	"sync"
	"time"
)

const (
	timestampBits = 41
	restaurantBits = 10
	sequenceBits = 12

	restaurantMax = 1<<restaurantBits - 1
	sequenceMax = 1<<sequenceBits - 1

	timestampShift = restaurantBits + sequenceBits
	restaurantShift = sequenceBits
)

var (
	Epoch          = time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC).UnixMilli()
	ErrInvalidRestaurantID = errors.New("invalid restaurant ID: must be between 0 and 1023")
	ErrClockMovedBackwards = errors.New("clock moved backwards, refusing to generate ID")
)

type Snowflake struct {
	mu           sync.Mutex
	lastTimestamp int64
	restaurantID  uint16
	sequence      uint16
}

func NewSnowflake(restaurantID uint16) (*Snowflake, error) {
	if restaurantID > restaurantMax {
		return nil, ErrInvalidRestaurantID
	}

	return &Snowflake{
		restaurantID: restaurantID,
		sequence:     0,
	}, nil
}

func (s *Snowflake) NextID() (uint64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UnixMilli()

	if now < s.lastTimestamp {
		return 0, ErrClockMovedBackwards
	}

	if now == s.lastTimestamp {
		s.sequence = (s.sequence + 1) & sequenceMax
		if s.sequence == 0 {
			for now <= s.lastTimestamp {
				now = time.Now().UnixMilli()
			}
		}
	} else {
		s.sequence = 0
	}

	s.lastTimestamp = now

	timestamp := now - Epoch

	id := (uint64(timestamp) << timestampShift) |
		(uint64(s.restaurantID) << restaurantShift) |
		uint64(s.sequence)

	return id, nil
}

func (s *Snowflake) ExtractTimestamp(id uint64) time.Time {
	timestamp := int64((id >> timestampShift) + uint64(Epoch))
	return time.UnixMilli(timestamp)
}

func (s *Snowflake) ExtractRestaurantID(id uint64) uint16 {
	return uint16((id >> restaurantShift) & restaurantMax)
}

func (s *Snowflake) ExtractSequence(id uint64) uint16 {
	return uint16(id & sequenceMax)
}
