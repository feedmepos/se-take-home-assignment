BINARY := bin/feedme

.PHONY: build test run run-demo lint tidy fmt clean

build:
	go build -o $(BINARY) ./cmd/api

test:
	go test ./... -race -v

run: build
	./$(BINARY) interactive

run-demo: build
	./$(BINARY) demo

lint:
	golangci-lint run ./...

tidy:
	go mod tidy

fmt:
	gofmt -l -s -w .

clean:
	rm -rf bin
