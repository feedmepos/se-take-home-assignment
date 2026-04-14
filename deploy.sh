#!/usr/bin/env bash

# 麦当劳订单控制器 — 部署到 AWS EC2（参考 dota2-replayer/deploy.sh 风格）
# 使用前请根据你的环境修改下列变量。

set -e

EC2_HOST="${EC2_HOST:-ec2-user@15.164.92.89}"
REMOTE_DIR="${REMOTE_DIR:-~/feedme-order-controller}"
LOCAL_PROJECT="${LOCAL_PROJECT:-$HOME/GolandProjects/se-take-home-assignment}"
SERVICE_PORT="${SERVICE_PORT:-8080}"
BINARY_NAME="feedme-order-server"

echo "开始部署 FeedMe 订单控制器..."
echo "目标主机: ${EC2_HOST}"
echo "远程目录: ${REMOTE_DIR}"

cd "${LOCAL_PROJECT}"
if [[ ! -f go.mod ]]; then
  echo "错误: 在 ${LOCAL_PROJECT} 未找到 go.mod，请先初始化 Go 模块并实现代码。"
  exit 1
fi
if [[ ! -d cmd/server ]]; then
  echo "错误: 未找到 cmd/server（见 DESIGN.md）。实现 HTTP 服务入口后再执行本脚本。"
  exit 1
fi

echo "正在本地交叉编译 Linux amd64 二进制..."
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o "${BINARY_NAME}" ./cmd/server

echo "正在同步代码与二进制到 EC2..."
rsync -avz \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='web/dist/' \
  --exclude='.idea/' \
  --exclude='.vscode/' \
  "${LOCAL_PROJECT}/" "${EC2_HOST}:${REMOTE_DIR}/"

echo "远程停止 dota2master（dota2-web 容器），避免端口/资源争用..."
ssh "${EC2_HOST}" "docker stop dota2-web || true"

echo "正在远程启动订单服务（若需 Docker 化可改为 docker build/run）..."
# 假设远程已安装同版本 Go 时可改为远程 go build；此处优先使用 rsync 过去的预编译二进制。
ssh "${EC2_HOST}" "mkdir -p ${REMOTE_DIR} && \
  pkill -f '${BINARY_NAME}' || true && \
  chmod +x ${REMOTE_DIR}/${BINARY_NAME} && \
  cd ${REMOTE_DIR} && nohup ./${BINARY_NAME} -addr :${SERVICE_PORT} > feedme-order.log 2>/dev/null &"

echo "清理本地交叉编译产物..."
rm -f "${LOCAL_PROJECT}/${BINARY_NAME}"

echo "部署完成。查看日志: ssh ${EC2_HOST} 'tail -f ${REMOTE_DIR}/feedme-order.log'"
echo "如需恢复 dota2master: ssh ${EC2_HOST} 'cd ~/dota2-replayer && ./deploy.sh' 或手动 docker start dota2-web"
