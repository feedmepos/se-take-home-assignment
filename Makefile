# Variables
APP_NAME := order-controller

# Phony targets
.PHONY: all build run interactive simulate test clean lint check

# Default: build
all: build

# 静态检查，约束 AI 生成的代码质量
lint:
	@echo "=> Running static analysis..."
	@golangci-lint run ./... || go vet ./...

# 终极一键断言（编译 + 检查 + 测试）
check: lint test
	@echo "=> All quality gates passed successfully!"



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
