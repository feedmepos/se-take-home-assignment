#!/usr/bin/env bash

# FeedMe 订单服务 — 本地编译后同步到与 dota2master 同一台 EC2（子路径 + 独立端口，见 deploy/nginx-dota2master-feedme.conf.example）
# 默认不停 dota2-web，与主站共存。

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

EC2_HOST="${EC2_HOST:-ec2-user@15.164.92.89}"
REMOTE_DIR="${REMOTE_DIR:-~/feedme-order-controller}"
LOCAL_PROJECT="${LOCAL_PROJECT:-$SCRIPT_DIR}"
SERVICE_PORT="${SERVICE_PORT:-18080}"
MOUNT_BASE="${MOUNT_BASE:-/feedme}"
VITE_BASE_PATH="${VITE_BASE_PATH:-/feedme/}"
STOP_DOTA2="${STOP_DOTA2:-0}"
BINARY_NAME="feedme-server"

# 避免 ssh/rsync 在部分网络下长时间卡在 GSSAPI/Kerberos 协商（可达数分钟）
SSH_BASE_OPTS=(-o BatchMode=yes -o ConnectTimeout=20 -o ConnectionAttempts=1 -o GSSAPIAuthentication=no)
RSYNC_RSH=(ssh "${SSH_BASE_OPTS[@]}")

echo "开始部署 FeedMe（端口 ${SERVICE_PORT}，子路径 ${MOUNT_BASE}/）..."
echo "目标主机: ${EC2_HOST}"
echo "远程目录: ${REMOTE_DIR}"
echo "本地项目: ${LOCAL_PROJECT}"

cd "${LOCAL_PROJECT}"
if [[ ! -f go.mod ]]; then
  echo "错误: 在 ${LOCAL_PROJECT} 未找到 go.mod。"
  exit 1
fi
if [[ ! -d cmd/server ]]; then
  echo "错误: 未找到 cmd/server。"
  exit 1
fi

if [[ -d web ]]; then
  echo "正在构建前端（VITE_BASE_PATH=${VITE_BASE_PATH}）..."
  ( cd web && npm ci && VITE_BASE_PATH="${VITE_BASE_PATH}" npm run build )
fi

echo "正在本地交叉编译 Linux amd64 二进制..."
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o "${BINARY_NAME}" ./cmd/server

echo "正在同步代码与二进制到 EC2..."
rsync -avz -e "${RSYNC_RSH[*]}" \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='web/dist/' \
  --exclude='.idea/' \
  --exclude='.vscode/' \
  "${LOCAL_PROJECT}/" "${EC2_HOST}:${REMOTE_DIR}/"

if [[ "${STOP_DOTA2}" == "1" ]]; then
  echo "远程停止 dota2-web 容器（STOP_DOTA2=1）..."
  ssh "${SSH_BASE_OPTS[@]}" -n "${EC2_HOST}" "docker stop dota2-web || true"
else
  echo "未设置 STOP_DOTA2=1，保留 dota2-web（主站 https://dota2master.com/ 不受影响）。"
fi

echo "正在远程启动订单服务..."
# 勿用 pkill -f feedme-server：会匹配到 ssh 远端命令行里的 ./feedme-server，导致部署中断。
# 此处不可加 ssh -n：stdin 需把 heredoc 传给远端 bash -s。
ssh "${SSH_BASE_OPTS[@]}" "${EC2_HOST}" env \
  REMOTE_DIR="${REMOTE_DIR}" \
  SERVICE_PORT="${SERVICE_PORT}" \
  MOUNT_BASE="${MOUNT_BASE}" \
  BINARY_NAME="${BINARY_NAME}" \
  bash -s <<'REMOTE_SCRIPT'
set -euo pipefail
case "${REMOTE_DIR}" in
  "~/"*) REMOTE_DIR="${HOME}/${REMOTE_DIR#~/}" ;;
  "~") REMOTE_DIR="${HOME}" ;;
esac
mkdir -p "${REMOTE_DIR}"
if command -v timeout >/dev/null 2>&1; then
  timeout 15 fuser -k "${SERVICE_PORT}/tcp" >/dev/null 2>&1 || true
else
  fuser -k "${SERVICE_PORT}/tcp" >/dev/null 2>&1 || true
fi
sleep 1
chmod +x "${REMOTE_DIR}/${BINARY_NAME}"
cd "${REMOTE_DIR}"
nohup "./${BINARY_NAME}" -addr ":${SERVICE_PORT}" -base "${MOUNT_BASE}" >>feedme-order.log 2>/dev/null </dev/null &
disown || true
sleep 1
REMOTE_SCRIPT

echo "清理本地交叉编译产物..."
rm -f "${LOCAL_PROJECT}/${BINARY_NAME}"

echo "部署完成。查看日志: ssh ${EC2_HOST} 'tail -f ${REMOTE_DIR}/feedme-order.log'"
echo "Nginx 示例片段见: deploy/nginx-dota2master-feedme.conf.example（proxy_pass 到 127.0.0.1:${SERVICE_PORT}）"
echo "若曾停过主站: ssh ${EC2_HOST} 'docker start dota2-web' 或 ~/GolandProjects/dota2-replayer/deploy.sh"
