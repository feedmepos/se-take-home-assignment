package cli

import (
	"mcdonalds-order-controller/application"
	"mcdonalds-order-controller/domain"
	"mcdonalds-order-controller/infrastructure"
	"os"
	"regexp"
	"strings"
	"testing"
)

func setupTestCLI() (*CLI, *os.File, *os.File) {
	scheduler := domain.NewBotScheduler()
	snowflake, _ := infrastructure.NewSnowflake(1)
	orderService := application.NewOrderService(snowflake, scheduler)
	botService := application.NewBotService(scheduler)

	// Create a pipe to capture output
	r, w, _ := os.Pipe()

	cli := NewCLI(orderService, botService, scheduler, w)
	return cli, r, w
}

func readOutput(r *os.File, w *os.File) string {
	w.Close()
	buf := make([]byte, 4096)
	n, _ := r.Read(buf)
	return string(buf[:n])
}

func TestCLI_ExecuteCommand_NewNormal(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	result := cli.ExecuteCommand("new-normal")

	if result == "" {
		t.Error("Expected non-empty result for new-normal command")
	}

	if !strings.Contains(result, "Created Normal Order") {
		t.Errorf("Expected result to contain 'Created Normal Order', got: %s", result)
	}

	// Check timestamp format HH:MM:SS
	timestampPattern := regexp.MustCompile(`^\d{2}:\d{2}:\d{2}`)
	if !timestampPattern.MatchString(result) {
		t.Errorf("Expected result to start with HH:MM:SS timestamp, got: %s", result)
	}

	readOutput(r, w)
}

func TestCLI_ExecuteCommand_NewVIP(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	result := cli.ExecuteCommand("new-vip")

	if result == "" {
		t.Error("Expected non-empty result for new-vip command")
	}

	if !strings.Contains(result, "Created VIP Order") {
		t.Errorf("Expected result to contain 'Created VIP Order', got: %s", result)
	}

	// Check timestamp format
	timestampPattern := regexp.MustCompile(`^\d{2}:\d{2}:\d{2}`)
	if !timestampPattern.MatchString(result) {
		t.Errorf("Expected result to start with HH:MM:SS timestamp, got: %s", result)
	}

	readOutput(r, w)
}

func TestCLI_ExecuteCommand_AddBot(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	result := cli.ExecuteCommand("+bot")

	if result == "" {
		t.Error("Expected non-empty result for +bot command")
	}

	if !strings.Contains(result, "Added Bot") {
		t.Errorf("Expected result to contain 'Added Bot', got: %s", result)
	}

	// Check timestamp format
	timestampPattern := regexp.MustCompile(`^\d{2}:\d{2}:\d{2}`)
	if !timestampPattern.MatchString(result) {
		t.Errorf("Expected result to start with HH:MM:SS timestamp, got: %s", result)
	}

	readOutput(r, w)
}

func TestCLI_ExecuteCommand_RemoveBot(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	// First add a bot
	cli.ExecuteCommand("+bot")

	// Then remove it
	result := cli.ExecuteCommand("-bot")

	if result == "" {
		t.Error("Expected non-empty result for -bot command")
	}

	if !strings.Contains(result, "Removed Bot") {
		t.Errorf("Expected result to contain 'Removed Bot', got: %s", result)
	}

	// Check timestamp format
	timestampPattern := regexp.MustCompile(`^\d{2}:\d{2}:\d{2}`)
	if !timestampPattern.MatchString(result) {
		t.Errorf("Expected result to start with HH:MM:SS timestamp, got: %s", result)
	}

	readOutput(r, w)
}

func TestCLI_ExecuteCommand_RemoveBot_WhenNoBots(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	result := cli.ExecuteCommand("-bot")

	if result == "" {
		t.Error("Expected non-empty result for -bot command when no bots")
	}

	if !strings.Contains(result, "No bots to remove") {
		t.Errorf("Expected result to contain 'No bots to remove', got: %s", result)
	}

	readOutput(r, w)
}

func TestCLI_ExecuteCommand_Status(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	// Add some data
	cli.ExecuteCommand("+bot")
	cli.ExecuteCommand("new-normal")

	result := cli.ExecuteCommand("status")

	if result == "" {
		t.Error("Expected non-empty result for status command")
	}

	if !strings.Contains(result, "Current Status") {
		t.Errorf("Expected result to contain 'Current Status', got: %s", result)
	}

	if !strings.Contains(result, "Bots:") {
		t.Errorf("Expected result to contain 'Bots:', got: %s", result)
	}

	if !strings.Contains(result, "Pending Orders:") {
		t.Errorf("Expected result to contain 'Pending Orders:', got: %s", result)
	}

	if !strings.Contains(result, "Complete Orders:") {
		t.Errorf("Expected result to contain 'Complete Orders:', got: %s", result)
	}

	// Check timestamp format - each line should have timestamp
	lines := strings.Split(result, "\n")
	timestampPattern := regexp.MustCompile(`^\d{2}:\d{2}:\d{2}`)
	for _, line := range lines {
		if line != "" && !timestampPattern.MatchString(line) {
			t.Errorf("Expected each line to start with HH:MM:SS timestamp, got: %s", line)
		}
	}

	readOutput(r, w)
}

func TestCLI_ExecuteCommand_Help(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	result := cli.ExecuteCommand("help")

	if result == "" {
		t.Error("Expected non-empty result for help command")
	}

	expectedCommands := []string{
		"new-normal",
		"new-vip",
		"+bot",
		"-bot",
		"status",
		"help",
		"exit",
		"quit",
	}

	for _, cmd := range expectedCommands {
		if !strings.Contains(result, cmd) {
			t.Errorf("Expected help result to contain '%s', got: %s", cmd, result)
		}
	}

	// Check timestamp format
	lines := strings.Split(result, "\n")
	timestampPattern := regexp.MustCompile(`^\d{2}:\d{2}:\d{2}`)
	for _, line := range lines {
		if line != "" && !timestampPattern.MatchString(line) {
			t.Errorf("Expected each line to start with HH:MM:SS timestamp, got: %s", line)
		}
	}

	readOutput(r, w)
}

func TestCLI_ExecuteCommand_Exit(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	result := cli.ExecuteCommand("exit")

	if !strings.Contains(result, "Goodbye") {
		t.Errorf("Expected result to contain 'Goodbye', got: %s", result)
	}

	readOutput(r, w)
}

func TestCLI_ExecuteCommand_Quit(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	result := cli.ExecuteCommand("quit")

	if !strings.Contains(result, "Goodbye") {
		t.Errorf("Expected result to contain 'Goodbye', got: %s", result)
	}

	readOutput(r, w)
}

func TestCLI_ExecuteCommand_Unknown(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	result := cli.ExecuteCommand("unknown-command")

	if !strings.Contains(result, "Unknown command") {
		t.Errorf("Expected result to contain 'Unknown command', got: %s", result)
	}

	// Check timestamp format
	timestampPattern := regexp.MustCompile(`^\d{2}:\d{2}:\d{2}`)
	if !timestampPattern.MatchString(result) {
		t.Errorf("Expected result to start with HH:MM:SS timestamp, got: %s", result)
	}

	readOutput(r, w)
}

func TestCLI_TimestampFormat(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	// Test that all commands produce proper timestamp format
	commands := []string{"new-normal", "new-vip", "+bot", "status", "help"}
	timestampPattern := regexp.MustCompile(`^\d{2}:\d{2}:\d{2}`)

	for _, cmd := range commands {
		result := cli.ExecuteCommand(cmd)
		if !timestampPattern.MatchString(result) {
			t.Errorf("Command '%s': Expected result to start with HH:MM:SS timestamp, got: %s", cmd, result)
		}
	}

	readOutput(r, w)
}

func TestCLI_ExecuteCommand_CaseInsensitive(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	// Test case insensitivity
	commands := []string{"NEW-NORMAL", "New-Vip", "+BOT", "STATUS", "HELP", "Exit"}

	for _, cmd := range commands {
		result := cli.ExecuteCommand(cmd)
		if result == "" && cmd != "Exit" {
			t.Errorf("Command '%s': Expected non-empty result", cmd)
		}
	}

	readOutput(r, w)
}

func TestCLI_ExecuteCommand_Empty(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	result := cli.ExecuteCommand("")

	if result != "" {
		t.Errorf("Expected empty result for empty command, got: %s", result)
	}

	result2 := cli.ExecuteCommand("   ")

	if result2 != "" {
		t.Errorf("Expected empty result for whitespace command, got: %s", result2)
	}

	readOutput(r, w)
}

func TestCLI_RemoveBot_WithProcessingOrder(t *testing.T) {
	cli, r, w := setupTestCLI()
	defer r.Close()

	// Add a bot
	cli.ExecuteCommand("+bot")

	// Create a normal order (will be assigned to bot immediately)
	cli.ExecuteCommand("new-normal")

	// Remove bot while order is being processed
	result := cli.ExecuteCommand("-bot")

	if !strings.Contains(result, "Removed Bot") {
		t.Errorf("Expected result to contain 'Removed Bot', got: %s", result)
	}

	// The order should be returned to queue
	if !strings.Contains(result, "returned to queue") {
		t.Errorf("Expected result to contain 'returned to queue', got: %s", result)
	}

	readOutput(r, w)
}
