package unique

import (
	"errors"
	"sync"
	"time"
)

const (
	// epoch is the custom epoch (2024-01-01 00:00:00 UTC in milliseconds)
	epoch int64 = 1704067200000

	// Bit lengths for each component
	workerIDBits     uint8 = 5  // 5 bits for worker ID (0-31)
	datacenterIDBits uint8 = 5  // 5 bits for datacenter ID (0-31)
	sequenceBits     uint8 = 12 // 12 bits for sequence number (0-4095)

	// Maximum values
	maxWorkerID     int64 = (1 << workerIDBits) - 1     // 31
	maxDatacenterID int64 = (1 << datacenterIDBits) - 1 // 31
	maxSequence     int64 = (1 << sequenceBits) - 1     // 4095

	// Shifts for each component
	workerIDShift     uint8 = sequenceBits
	datacenterIDShift uint8 = sequenceBits + workerIDBits
	timestampShift    uint8 = sequenceBits + workerIDBits + datacenterIDBits
)

// Snowflake represents a Snowflake ID generator
type Snowflake struct {
	mu           sync.Mutex
	timestamp    int64
	workerID     int64
	datacenterID int64
	sequence     int64
}

// NewSnowflake creates a new Snowflake ID generator
// workerID: 0-31 (5 bits)
// datacenterID: 0-31 (5 bits)
func NewSnowflake(workerID, datacenterID int64) (*Snowflake, error) {
	if workerID < 0 || workerID > maxWorkerID {
		return nil, errors.New("worker ID must be between 0 and 31")
	}
	if datacenterID < 0 || datacenterID > maxDatacenterID {
		return nil, errors.New("datacenter ID must be between 0 and 31")
	}

	return &Snowflake{
		timestamp:    0,
		workerID:     workerID,
		datacenterID: datacenterID,
		sequence:     0,
	}, nil
}

// Generate creates a unique Snowflake ID
func (s *Snowflake) Generate() (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UnixMilli() - epoch

	// Handle clock moving backwards
	if now < s.timestamp {
		return 0, errors.New("clock moved backwards, refusing to generate ID")
	}

	if now == s.timestamp {
		// Same millisecond, increment sequence
		s.sequence = (s.sequence + 1) & maxSequence
		if s.sequence == 0 {
			// Sequence overflow, wait for next millisecond
			for now <= s.timestamp {
				now = time.Now().UnixMilli() - epoch
			}
		}
	} else {
		// New millisecond, reset sequence
		s.sequence = 0
	}

	s.timestamp = now

	// Compose the ID
	id := (now << timestampShift) |
		(s.datacenterID << datacenterIDShift) |
		(s.workerID << workerIDShift) |
		s.sequence

	return id, nil
}

// ParseID extracts the components from a Snowflake ID
func ParseID(id int64) (timestamp int64, workerID int64, datacenterID int64, sequence int64) {
	sequence = id & maxSequence
	workerID = (id >> workerIDShift) & maxWorkerID
	datacenterID = (id >> datacenterIDShift) & maxDatacenterID
	timestamp = (id >> timestampShift) + epoch
	return
}

// IDToTime converts a Snowflake ID to the time it was created
func IDToTime(id int64) time.Time {
	timestamp := (id >> timestampShift) + epoch
	return time.UnixMilli(timestamp)
}

// gen is a default Snowflake generator (worker=1, datacenter=1)
var gen *Snowflake

func init() {
	var err error
	gen, err = NewSnowflake(1, 1)
	if err != nil {
		panic(err)
	}
}

// NextID generates a unique ID using the default generator
func NextID() int64 {
	id, err := gen.Generate()
	if err != nil {
		panic(err)
	}
	return id
}
