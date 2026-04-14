#!/usr/bin/env bash
# 将当前仓库的改动 add、commit 并 push 到 GitHub（远端默认 origin）。
# 用法（在项目根或任意目录执行均可）：
#   ./scripts/commit-push-github.sh "提交说明"
# 未写说明时，使用默认信息：chore: 更新 <本地时间>

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MSG="${*}"
if [[ -z "${MSG// }" ]]; then
  MSG="chore: 更新 $(date '+%Y-%m-%d %H:%M:%S')"
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "错误：${ROOT} 不是 git 仓库。"
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "错误：未配置 git remote origin，请先：git remote add origin <你的 GitHub 仓库 URL>"
  exit 1
fi

echo ">>> git status（简要）"
git status -sb

if [[ -z "$(git status --porcelain)" ]]; then
  echo "没有需要提交的改动，已退出。"
  exit 0
fi

echo ">>> git add -A"
git add -A

echo ">>> git commit -m …"
# 单行说明避免 -m 多行问题；若需多行可改为编辑器：git commit（去掉 -m）
git commit -m "${MSG}"

branch="$(git rev-parse --abbrev-ref HEAD)"
echo ">>> git push origin ${branch}"
git push origin "${branch}"

echo "完成：已推送到 origin/${branch}"
