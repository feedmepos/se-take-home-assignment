package restaurant

import "fmt"

type RobotStatus string

const (
	Idle RobotStatus = "IDLE"
	Busy RobotStatus = "BUSY"
)

type Robot struct {
	ID             int
	Name           string
	Status         RobotStatus
	CurrentOrderID *int
}

type robotFleet struct {
	robots []*Robot
	nextID int
}

func newRobotFleet() *robotFleet {
	return &robotFleet{nextID: 1}
}

func (f *robotFleet) add(name string) *Robot {
	if name == "" {
		name = fmt.Sprintf("Bot #%d", f.nextID)
	}
	robot := &Robot{
		ID:     f.nextID,
		Name:   name,
		Status: Idle,
	}
	f.robots = append(f.robots, robot)
	f.nextID++
	return robot
}

func (f *robotFleet) newest() (*Robot, bool) {
	if len(f.robots) == 0 {
		return nil, false
	}
	return f.robots[len(f.robots)-1], true
}

func (f *robotFleet) removeNewest() (*Robot, bool) {
	robot, ok := f.newest()
	if !ok {
		return nil, false
	}
	f.robots = f.robots[:len(f.robots)-1]
	return robot, true
}

func (f *robotFleet) snapshot() []Robot {
	robots := make([]Robot, len(f.robots))
	for i, robot := range f.robots {
		robots[i] = *robot
	}
	return robots
}
