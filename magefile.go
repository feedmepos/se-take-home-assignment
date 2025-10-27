//go:build mage

package main

import (
	"fmt"
	"os"

	"github.com/magefile/mage/mg"
	"github.com/magefile/mage/sh"
)

// Build builds the application
func Build() error {
	fmt.Println("Building application...")
	return sh.Run("go", "build", "-o", "bin/mcmocknald-api.exe", "cmd/api/main.go")
}

// Run runs the application in memory mode
func Run() error {
	fmt.Println("Running application in memory mode...")
	env := map[string]string{"MODE": "memory"}
	return sh.RunWith(env, "go", "run", "cmd/api/main.go")
}

// RunDB runs the application in database mode
func RunDB() error {
	fmt.Println("Running application in database mode...")
	env := map[string]string{"MODE": "database"}
	return sh.RunWith(env, "go", "run", "cmd/api/main.go")
}

// Test runs all tests (unit tests only, fast)
func Test() error {
	fmt.Println("Running all unit tests...")
	return sh.RunV("go", "test", "./...", "-v", "-short")
}

// TestAll runs all tests including integration and scenario tests
func TestAll() error {
	fmt.Println("Running all tests (unit + integration + scenario)...")
	mg.Deps(TestUnit, TestIntegration, TestScenario)
	return nil
}

// TestUnit runs unit tests only
func TestUnit() error {
	fmt.Println("Running unit tests...")
	return sh.RunV("go", "test", "./...", "-v", "-short")
}

// TestIntegration runs integration tests (requires database)
func TestIntegration() error {
	fmt.Println("Running integration tests...")
	return sh.RunV("go", "test", "./test/integration/...", "-v", "-tags=integration")
}

// TestScenario runs all scenario/load tests
func TestScenario() error {
	fmt.Println("Running all scenario tests...")
	return sh.RunV("go", "test", "./test/scenario/...", "-v", "-tags=scenario", "-timeout", "10m")
}

// TestS1 runs scenario 1 (small load: 100 Regular, 50 VIP, 25 Cooks)
func TestS1() error {
	fmt.Println("Running test scenario 1 (100 Regular, 50 VIP, 25 Cooks)...")
	return sh.RunV("go", "test", "./test/scenario/...", "-v", "-tags=scenario", "-run", "TestSmallLoad", "-timeout", "5m")
}

// TestS2 runs scenario 2 (large load: 10,000 Regular, 5,000 VIP, 1,250 Cooks)
func TestS2() error {
	fmt.Println("Running test scenario 2 (10,000 Regular, 5,000 VIP, 1,250 Cooks)...")
	return sh.RunV("go", "test", "./test/scenario/...", "-v", "-tags=scenario", "-run", "TestLargeLoad", "-timeout", "10m")
}

// TestCoverage runs tests with coverage report
func TestCoverage() error {
	fmt.Println("Running tests with coverage...")
	if err := sh.Run("go", "test", "./...", "-coverprofile=coverage.out"); err != nil {
		return err
	}
	if err := sh.Run("go", "tool", "cover", "-html=coverage.out", "-o", "coverage.html"); err != nil {
		return err
	}
	fmt.Println("Coverage report generated: coverage.html")
	return nil
}

// Clean cleans build artifacts and logs
func Clean() error {
	fmt.Println("Cleaning build artifacts and logs...")
	os.RemoveAll("bin/")
	os.RemoveAll("logs/")
	os.Remove("coverage.out")
	os.Remove("coverage.html")
	fmt.Println("Clean complete!")
	return nil
}

// Deps downloads and tidies dependencies
func Deps() error {
	fmt.Println("Downloading dependencies...")
	mg.Deps(downloadDeps, tidyDeps)
	return nil
}

func downloadDeps() error {
	return sh.Run("go", "mod", "download")
}

func tidyDeps() error {
	return sh.Run("go", "mod", "tidy")
}

// Fmt formats Go code
func Fmt() error {
	fmt.Println("Formatting code...")
	return sh.RunV("go", "fmt", "./...")
}

// Lint runs the linter
func Lint() error {
	fmt.Println("Running linter...")
	return sh.RunV("golangci-lint", "run")
}

// MigrateUp runs database migrations (UP)
func MigrateUp() error {
	fmt.Println("Running database migrations (UP)...")
	return sh.Run("psql", "-h", "localhost", "-p", "7001", "-U", "postgres", "-d", "mcmocknald", "-f", "migrations/001_create_schema.up.sql")
}

// MigrateDown rolls back database migrations (DOWN)
func MigrateDown() error {
	fmt.Println("WARNING: This will delete all data!")
	fmt.Print("Are you sure? [y/N]: ")
	var response string
	fmt.Scanln(&response)
	if response != "y" && response != "Y" {
		fmt.Println("Migration rollback cancelled.")
		return nil
	}
	return sh.Run("psql", "-h", "localhost", "-p", "7001", "-U", "postgres", "-d", "mcmocknald", "-f", "migrations/001_create_schema.down.sql")
}

// DockerDB starts PostgreSQL in Docker
func DockerDB() error {
	fmt.Println("Starting PostgreSQL in Docker...")
	return sh.Run("docker", "run", "--name", "mcmocknald-postgres",
		"-e", "POSTGRES_PASSWORD=postgres",
		"-e", "POSTGRES_DB=mcmocknald",
		"-p", "7001:5432",
		"-d", "postgres:15-alpine")
}

// DockerDBStop stops and removes the PostgreSQL container
func DockerDBStop() error {
	fmt.Println("Stopping PostgreSQL container...")
	if err := sh.Run("docker", "stop", "mcmocknald-postgres"); err != nil {
		return err
	}
	return sh.Run("docker", "rm", "mcmocknald-postgres")
}
