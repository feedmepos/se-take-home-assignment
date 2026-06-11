# 快速上手

## 一键验证

```sh
./scripts/test.sh && ./scripts/build.sh && PROCESS_SECONDS=0.5 ./scripts/run.sh
```

## 分步

```sh
./scripts/test.sh                      # go test -race -v ./...
./scripts/build.sh                     # 产出 bin/order-controller
./bin/order-controller                 # 交互模式（stdin REPL，输入 help 看命令）
PROCESS_SECONDS=1 ./bin/order-controller   # 加速：单订单 1s
./scripts/run.sh                       # 批处理演示 → scripts/result.txt（真实 10s，约 35s）
```

命令集见 [40-api/cli-commands.md](../40-api/cli-commands.md)；
时长与加速机制见 [30-design/time-and-acceleration.md](../30-design/time-and-acceleration.md)。
