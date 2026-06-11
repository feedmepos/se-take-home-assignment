# CI 校验（backend-verify-result）

Workflow：`.github/workflows/backend-verify-result.yaml`，PR 到 `main` 时触发
（opened / synchronize / reopened / edited）。

## 执行顺序

1. `scripts/test.sh` — `go test -race -v ./...`，必须 exit 0。
2. `scripts/build.sh` — `go build` → `bin/order-controller`，必须 exit 0。
3. `scripts/run.sh` — 构建后把演示命令脚本喂入 CLI，输出写到 `scripts/result.txt`
   （CI 上以真实 10s 处理时长运行，全程约 35s）。
4. 校验 `scripts/result.txt`：存在、非空、且包含 `[0-9]{2}:[0-9]{2}:[0-9]{2}` 时间戳。

## 注意事项

- 三个脚本都 `cd` 到仓库根再执行，从任意目录调用均可。
- `bin/` 已被 `.gitignore` 排除；`result.txt` 提交一份真实 10s 的本地产出作为参考，
  CI 每次会重新生成覆盖。
- 走 GitHub Flow：feature 分支 → PR 到 main → workflow 通过后合并。
