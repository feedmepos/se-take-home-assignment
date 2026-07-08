# McDonald's Order Controller — developer shortcuts
# CI still uses scripts/*.sh directly; make targets delegate to those scripts where applicable.

.PHONY: help all build test run run-fast ci clean coverage fmt vet repl

BINARY       := bin/order-controller
CMD_PKG      := ./cmd/order-controller
GO           := go
PROCESS_DURATION ?= 10s

.DEFAULT_GOAL := help

help: ## Show available targets
	@echo "Usage: make [target]"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  %-14s %s\n", $$1, $$2}'

all: ci ## Alias for ci (test + build + run)

build: ## Build bin/order-controller
	./scripts/build.sh

test: ## Run all tests with race detector
	./scripts/test.sh

run: ## Run CI batch scenario → scripts/result.txt (PROCESS_DURATION=$(PROCESS_DURATION))
	ORDER_PROCESS_DURATION=$(PROCESS_DURATION) ./scripts/run.sh

run-fast: ## Run CI scenario with 100ms process duration
	ORDER_PROCESS_DURATION=100ms ./scripts/run.sh

ci: test build run ## Full local CI verification (same order as GitHub Actions)

clean: ## Remove build artifacts and coverage output
	rm -rf bin/order-controller coverage.out

coverage: ## Generate and print test coverage report
	$(GO) test ./... -race -coverprofile=coverage.out -count=1
	$(GO) tool cover -func=coverage.out

fmt: ## Format all Go source files
	$(GO) fmt ./...

vet: ## Run go vet on all packages
	$(GO) vet ./...

repl: build ## Start interactive REPL (requires prior build)
	./$(BINARY) --interactive
