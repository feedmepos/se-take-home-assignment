package utils

import (
	"fmt"
	"os"
	"sync"
	"time"
)

type ManagerLogger struct {
	mu      sync.Mutex
	actions []string
	logFile string
}

var (
	instance *ManagerLogger
	once     sync.Once
)

func GetManagerLogger() *ManagerLogger {
	once.Do(func() {
		instance = &ManagerLogger{
			actions: make([]string, 0, 10),
			logFile: "/Users/tor/Desktop/se-take-home-assignment/manager.log",
		}
		// Clear file on startup
		_ = os.WriteFile(instance.logFile, []byte(""), 0644)
	})
	return instance
}

func (l *ManagerLogger) LogAction(action string, activeBots int, inProcess int, inQueue int, completed int) {
	l.mu.Lock()
	defer l.mu.Unlock()

	timestamp := time.Now().Format("15:04:05")
	entry := fmt.Sprintf("[%s] %s", timestamp, action)

	// Update last 10 actions
	l.actions = append(l.actions, entry)
	if len(l.actions) > 10 {
		l.actions = l.actions[1:]
	}

	// Format dashboard
	dashboard := "McDonald McDonald McDonald McDonald McDonald\n"
	dashboard += "================ SYSTEM STATUS ================\n"
	dashboard += fmt.Sprintf("Last Update: %s\n", timestamp)
	dashboard += "-----------------------------------------------\n"
	dashboard += fmt.Sprintf("1. Current active bots: %d\n", activeBots)
	dashboard += "2. Order status:\n"
	dashboard += fmt.Sprintf("   - [In Process]: %d\n", inProcess)
	dashboard += fmt.Sprintf("   - [In Queue]  : %d\n", inQueue)
	dashboard += fmt.Sprintf("   - [Completed] : %d\n", completed)
	dashboard += "-----------------------------------------------\n"
	dashboard += "3. Last 10 actions log:\n"
	for i := len(l.actions) - 1; i >= 0; i-- {
		dashboard += fmt.Sprintf("   - %s\n", l.actions[i])
	}
	dashboard += "===============================================\n"

	// Overwrite file for "live" feel
	_ = os.WriteFile(l.logFile, []byte(dashboard), 0644)
}
func (l *ManagerLogger) GetStatus() (actions []string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	
	// Return a copy of actions
	actions = make([]string, len(l.actions))
	copy(actions, l.actions)
	return actions
}
