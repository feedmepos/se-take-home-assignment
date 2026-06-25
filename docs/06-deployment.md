# McDonald 订单管理系统 - 部署文档

|**文档编号**: 06
|**版本**: 1.0
|**创建日期**: 2026-06-25
|**作者**: DevOps Engineer

---

## 一、环境要求

### 1.1 运行时环境

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| Go | 1.23.9+ | 后端 CLI 运行时 |
| Git | 最新版 | 版本控制 |
| Ubuntu | 22.04+ | GitHub Actions 运行容器 |

### 1.2 开发环境依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `actions/checkout@v4` | v4 | 代码检出 |
| `actions/setup-go@v5` | v5 | Go 环境配置 |

### 1.3 项目依赖

```
McDonald/
├── go.mod              # Go 模块定义
├── go.sum              # 依赖校验
└── script/             # 部署脚本目录
    ├── test.sh         # 测试脚本
    ├── build.sh        # 构建脚本
    └── run.sh          # 运行脚本
```

---

## 二、项目结构

### 2.1 部署相关目录

```
McDonald/
├── .github/
│   └── workflows/
│       └── backend-verify-result.yaml  # GitHub Actions 工作流
├── script/
│   ├── test.sh        # 测试脚本
│   ├── build.sh       # 构建脚本
│   ├── run.sh         # 运行脚本
│   └── result.txt     # 运行结果输出
├── cmd/
│   └── cli/
│       └── main.go    # CLI 应用入口
├── internal/
│   ├── model/         # 数据模型
│   ├── queue/         # 优先级队列
│   ├── system/        # 系统状态管理
│   └── output/        # 输出管理
└── docs/
    └── 06-deployment.md  # 本文档
```

### 2.2 构建产物

| 产物 | 路径 | 说明 |
|------|------|------|
| CLI 可执行文件 | `./order-controller` | 编译后的二进制文件 |
| 运行结果 | `./result.txt` | 包含 HH:MM:SS 时间戳的输出 |

---

## 三、GitHub Actions 配置

### 3.1 工作流文件

完整的工作流配置位于 `.github/workflows/backend-verify-result.yaml`：

```yaml
name: backend-verify-result

on:
  pull_request:
    types: [ opened, synchronize, reopened, edited ]
    branches: [ main ]

jobs:
  verify-result:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Set up Go
      uses: actions/setup-go@v5
      with:
        go-version: '1.23.9'
        
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22.19.0'
        
    - name: Verify Go version
      run: go version
      
    - name: Verify Node.js version
      run: node --version
      
    - name: Verify npm version
      run: npm --version

    - name: Make scripts executable
      run: chmod +x scripts/test.sh scripts/build.sh scripts/run.sh
      
    - name: Execute test script
      run: ./scripts/test.sh
      
    - name: Execute build script
      run: ./scripts/build.sh
      
    - name: Execute run script
      run: ./scripts/run.sh
      
    - name: Verify result.txt exists and is not empty
      run: |
        if [ ! -f scripts/result.txt ]; then
          echo "ERROR: scripts/result.txt does not exist"
          exit 1
        fi
        
        if [ ! -s scripts/result.txt ]; then
          echo "ERROR: scripts/result.txt is empty"
          exit 1
        fi
        
        # Verify that the result contains timestamps in HH:MM:SS format
        if ! grep -E '[0-9]{2}:[0-9]{2}:[0-9]{2}' scripts/result.txt > /dev/null; then
          echo "ERROR: scripts/result.txt must contain timestamps in HH:MM:SS format"
          echo "No valid timestamp pattern found in the output"
          exit 1
        fi
        
        echo "SUCCESS: scripts/result.txt exists, is not empty, and contains valid timestamps"
        echo "Content of scripts/result.txt:"
        cat scripts/result.txt
```

### 3.2 触发条件

| 事件 | 触发条件 |
|------|----------|
| PR 创建 | `pull_request` + `opened` |
| PR 同步 | `pull_request` + `synchronize` |
| PR 重新打开 | `pull_request` + `reopened` |
| PR 编辑 | `pull_request` + `edited` |

### 3.3 CI 流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    Pull Request 触发                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Checkout Code (actions/checkout@v4)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Setup Go 1.23.9 (actions/setup-go@v5)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Setup Node.js 22.19.0 (actions/setup-node@v4)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Make Scripts Executable (chmod +x)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Execute test.sh                                         │
│     - 运行单元测试                                            │
│     - 验证代码正确性                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Execute build.sh                                        │
│     - 编译 Go CLI 应用                                       │
│     - 生成可执行文件                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Execute run.sh                                          │
│     - 运行 CLI 应用                                           │
│     - 输出到 result.txt                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Verify result.txt                                       │
│     - 检查文件存在                                           │
│     - 检查文件非空                                           │
│     - 验证 HH:MM:SS 时间戳格式                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CI 通过 / 失败                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、部署脚本

### 4.1 test.sh - 测试脚本

```bash
#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

# For Go projects:
# go test ./... -v

# For Node.js projects:
# npm test

echo "Unit tests completed"
```

### 4.2 build.sh - 构建脚本

```bash
#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

# For Go projects:
# go build -o order-controller ./cmd/main.go

# For Node.js projects:
# npm install
# npm run build (if needed)

echo "Build completed"
```

### 4.3 run.sh - 运行脚本

```bash
#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# For Go projects:
# ./order-controller > result.txt

# For Node.js projects:
# node index.js > result.txt
# or npm start > result.txt

# Temporary placeholder - remove this when you implement your CLI
echo "Added 1 bot" > result.txt
echo "status: bot: [1], order: []" >> result.txt

echo "CLI application execution completed"
```

---

## 五、部署验证步骤

### 5.1 本地部署验证

#### 步骤 1: 环境检查

```bash
# 检查 Go 版本
go version

# 检查 Git 版本
git version

# 验证当前目录
pwd
```

#### 步骤 2: 本地构建

```bash
# 克隆仓库
git clone <repository-url>
cd McDonald

# 设置脚本可执行权限
chmod +x scripts/test.sh scripts/build.sh scripts/run.sh

# 运行测试
./scripts/test.sh

# 运行构建
./scripts/build.sh

# 运行应用
./scripts/run.sh

# 查看结果
cat result.txt
```

#### 步骤 3: 验证输出格式

```bash
# 检查 result.txt 是否存在
ls -la result.txt

# 验证 HH:MM:SS 时间戳格式
grep -E '[0-9]{2}:[0-9]{2}:[0-9]{2}' result.txt

# 查看完整内容
cat result.txt
```

### 5.2 GitHub Actions 部署验证

#### 步骤 1: 创建分支

```bash
# 创建新分支
git checkout -b feature/implement-cli

# 添加代码
git add .

# 提交
git commit -m "Implement CLI application"
```

#### 步骤 2: 推送并创建 PR

```bash
# 推送分支
git push -u origin feature/implement-cli

# 创建 Pull Request
gh pr create --title "Implement CLI application" --body "## Summary
- Add Go CLI implementation
- Add test/build/run scripts
- Verify result.txt with timestamps

## Test plan
- [ ] All tests pass
- [ ] Build succeeds
- [ ] result.txt contains valid timestamps"
```

#### 步骤 3: 检查 CI 状态

1. 打开 GitHub 仓库页面
2. 点击 "Pull requests" 标签
3. 选择你的 PR
4. 查看 "Checks" 状态

### 5.3 验证检查清单

| 检查项 | 验证方式 | 预期结果 |
|--------|----------|----------|
| 测试通过 | `./scripts/test.sh` | 无错误输出 |
| 构建成功 | `./scripts/build.sh` | 生成 `order-controller` 文件 |
| 运行正常 | `./scripts/run.sh` | 生成 `result.txt` |
| 文件存在 | `ls -la result.txt` | 文件存在且非空 |
| 时间戳格式 | `grep -E '[0-9]{2}:[0-9]{2}:[0-9]{2}' result.txt` | 匹配 HH:MM:SS 格式 |

---

## 六、部署配置参数

### 6.1 Go 版本配置

| 环境变量 | 值 | 说明 |
|----------|-----|------|
| `go-version` | `1.23.9` | Go 编译器版本 |

### 6.2 Node.js 版本配置

| 环境变量 | 值 | 说明 |
|----------|-----|------|
| `node-version` | `22.19.0` | Node.js 运行时版本 |

### 6.3 构建参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 输出文件 | `order-controller` | 编译后的可执行文件 |
| 输出目录 | `./` | 当前目录 |
| 入口文件 | `./cmd/main.go` | CLI 应用入口 |

---

## 七、常见问题排查

### 7.1 脚本权限问题

**问题**: `Permission denied: ./scripts/test.sh`

**解决方案**:
```bash
chmod +x scripts/test.sh scripts/build.sh scripts/run.sh
```

### 7.2 Go 版本不匹配

**问题**: `go: cannot find go.mod`

**解决方案**:
1. 确保在项目根目录
2. 检查 `go.mod` 文件存在
3. 确认 Go 版本 >= 1.23.9

### 7.3 result.txt 验证失败

**问题**: `ERROR: result.txt does not exist` 或时间戳格式错误

**解决方案**:
1. 检查 `run.sh` 是否正确输出到 `result.txt`
2. 确认输出包含 `HH:MM:SS` 格式时间戳
3. 查看运行日志排查错误

### 7.4 GitHub Actions 超时

**问题**: 工作流运行超时

**解决方案**:
1. 检查脚本是否进入死循环
2. 验证 CLI 应用是否正确退出
3. 添加超时控制

---

## 八、安全考虑

### 8.1 依赖安全

- 使用 `go mod verify` 验证依赖完整性
- 定期更新 Go 版本以获取安全补丁

### 8.2 脚本安全

- 确保脚本文件权限为可执行
- 避免在脚本中硬编码敏感信息

### 8.3 CI 安全

- 使用官方 GitHub Actions
- 最小化仓库权限
- 定期审计工作流配置

---

## 九、部署流程总结

```
┌─────────────────────────────────────────────────────────────┐
│                        部署流程                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 开发环境                                                  │
│     ├─ 编写代码                                               │
│     ├─ 本地测试                                               │
│     └─ 本地构建验证                                           │
│                                                             │
│  2. 代码提交                                                  │
│     ├─ 创建功能分支                                           │
│     ├─ 提交代码                                               │
│     └─ 推送到远程                                             │
│                                                             │
│  3. Pull Request                                            │
│     ├─ 创建 PR                                               │
│     ├─ 触发 CI                                               │
│     └─ 等待验证                                               │
│                                                             │
│  4. CI 验证                                                  │
│     ├─ 执行 test.sh                                          │
│     ├─ 执行 build.sh                                         │
│     ├─ 执行 run.sh                                           │
│     └─ 验证 result.txt                                       │
│                                                             │
│  5. 合并                                                     │
│     ├─ 代码审查                                               │
│     ├─ CI 通过                                               │
│     └─ 合并到 main                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 十、相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 架构设计 | `docs/02-architecture.md` | 系统架构和模块设计 |
| 项目计划 | `docs/00-project-plan.md` | 项目整体规划 |
| 需求说明 | `se-take-home-assignment/README.md` | 功能需求定义 |

---

*文档版本: 1.0*
*最后更新: 2026-06-25*
