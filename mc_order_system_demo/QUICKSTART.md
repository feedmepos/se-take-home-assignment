# 快速参考

## 常用命令

### 构建
```bash
bash script/build.sh
# 或
go build -o mc-order-system .
```

### 测试
```bash
bash script/test.sh
# 或
go test -v
```

### 运行
```bash
# 交互式
./mc-order-system

# 使用脚本运行演示
bash script/run.sh
```

## CLI命令速查

### 订单
- `new normal` - 创建普通订单
- `new vip` - 创建VIP订单
- `pending` - 查看待处理订单
- `completed` - 查看已完成订单

### 机器人
- `+bot` - 创建机器人
- `-bot` - 删除机器人
- `bots` - 查看机器人状态

### 系统
- `status` - 系统状态
- `result` - 保存到result.txt
- `help` - 帮助
- `quit` - 退出

## 项目文件

```
├── main.go                 # CLI主程序
├── order_system.go         # 核心逻辑
├── order_system_test.go    # 测试
├── go.mod                  # Go模块
├── README.md               # 使用文档
├── result.txt              # 运行结果（自动生成）
└── script/
    ├── test.sh            # 测试脚本
    ├── build.sh           # 构建脚本
    └── run.sh             # 运行脚本
```

## 功能验证清单

- [x] 创建普通订单
- [x] 创建VIP订单
- [x] 订单号唯一递增
- [x] VIP订单优先处理
- [x] 创建机器人自动处理订单
- [x] 机器人空闲等待
- [x] 删除机器人订单返回队列
- [x] 内存存储，无需持久化
- [x] 交互式CLI
- [x] 结果输出到result.txt
- [x] 时间戳格式HH:MM:SS
- [x] 单元测试覆盖

## 运行示例

```bash
# 1. 构建
bash script/build.sh

# 2. 测试
bash script/test.sh

# 3. 运行
./mc-order-system

# 4. 在CLI中执行命令
> new normal
> new vip
> +bot
> status
> result
> quit
```
