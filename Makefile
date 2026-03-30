.PHONY: build test run clean distclean dev lint build-frontend build-backend build-full

# 快速构建（仅后端，开发用）
build: build-backend

# 完整构建（前端 + 后端嵌入）
build-full: build-frontend build-backend-prod

# 前端构建
build-frontend:
	cd webui && npm install && npm run build

# 后端编译（开发模式，不嵌入前端）
build-backend:
	cd src && go mod tidy && go build -o ../bin/order-controller .

# 后端编译（生产模式，嵌入前端）
build-backend-prod: build-frontend
	cp -r webui/dist src/frontend/dist 2>/dev/null || true
	cd src && go mod tidy && go build -tags prod -o ../bin/order-controller .
	rm -rf src/frontend/dist

# 单元测试
test:
	cd src && go mod tidy && go test ./... -v -race -count=1

# E2E 测试
test-e2e:
	cd tests/e2e && npm install && npx playwright install --with-deps && npx playwright test

# 运行模拟模式
run: build
	./bin/order-controller simulate > scripts/result.txt 2>&1

# 启动服务模式
run-serve: build
	./bin/order-controller serve --port 8080

# 交互模式
run-interactive: build
	./bin/order-controller interactive

# 开发模式（前后端分离）
dev:
	@$(MAKE) -j2 dev-frontend dev-backend

dev-frontend:
	cd webui && npm run dev

dev-backend:
	cd src && go run . serve --port 8080

# Lint
lint:
	cd src && go mod tidy && go vet ./...

# 清理编译目标和中间文件
clean:
	rm -rf bin/
	rm -rf webui/dist/
	rm -rf src/frontend/

# 清理所有文件（恢复到最干净状态）
distclean: clean
	rm -rf webui/node_modules/
	rm -rf tests/e2e/node_modules/
	cd src && go clean -cache -testcache
	rm -f src/go.sum
	cd src && go clean -modcache
