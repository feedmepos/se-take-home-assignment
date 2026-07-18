# Variables
APP_NAME := order-controller

# Phony targets
.PHONY: all build run interactive simulate test clean

# Default: build
all: build

# Build CLI application
build:
	./scripts/build.sh

# Run interactive CLI (requires build first)
run: build
	./order-controller interactive

# Alias for interactive CLI
interactive: run

# Run automated simulation
simulate: build
	@echo "=> Running Simulation..."
	./scripts/run.sh

# Run unit tests
test:
	./scripts/test.sh

# Clean build artifacts
clean:
	@echo "=> Cleaning up..."
	rm -f $(APP_NAME)
	@echo "=> Clean complete."
