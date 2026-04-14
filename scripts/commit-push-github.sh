#!/usr/bin/env bash
# 将当前仓库的改动 add、commit 并 push 到 GitHub。
# 用法（在项目根或任意目录执行均可）：
#   ./scripts/commit-push-github.sh "提交说明"
# 未写说明时，使用默认信息：chore: 更新 <本地时间>
#
# 推送目标：
#   - 若设置 GIT_PUSH_URL，则推送到该 URL（SSH 或 HTTPS）。
#   - 否则若 origin 指向 feedmepos/se-take-home-assignment（无写权限），自动改推
#     到 linchanghui/se-take-home-assignment（与 origin 同用 SSH 或 HTTPS）。
#   - 其它情况仍推送到 remote 名称 origin。
# 可选：FIX_ORIGIN=1 在成功 push 后把 origin 的 URL 改成实际推送地址，便于以后直接 git push。

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

origin_url="$(git remote get-url origin)"
GITHUB_USER="${GITHUB_USER:-linchanghui}"
REPO_NAME="${REPO_NAME:-se-take-home-assignment}"

# 解析实际推送地址 / remote 名
if [[ -n "${GIT_PUSH_URL:-}" ]]; then
  push_mode="url"
  push_target="${GIT_PUSH_URL}"
elif [[ "${origin_url}" == *"feedmepos/${REPO_NAME}"* ]]; then
  push_mode="url"
  if [[ "${origin_url}" == https://* || "${origin_url}" == http://* ]]; then
    push_target="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
  else
    push_target="git@github.com:${GITHUB_USER}/${REPO_NAME}.git"
  fi
  echo ">>> 检测到 origin 为 feedmepos 上游，将推送到个人仓库：${push_target}"
else
  push_mode="remote"
  push_target="origin"
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
git commit -m "${MSG}"

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${push_mode}" == "remote" ]]; then
  echo ">>> git push origin ${branch}"
  git push origin "${branch}"
else
  echo ">>> git push -u <个人仓库> ${branch}"
  git push -u "${push_target}" "${branch}"
  if [[ "${FIX_ORIGIN:-}" == "1" ]]; then
    echo ">>> FIX_ORIGIN=1：将 origin 改为 ${push_target}"
    git remote set-url origin "${push_target}"
  fi
fi

echo "完成：已推送分支 ${branch}"
