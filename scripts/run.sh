#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

ADDR="127.0.0.1:18080"
BASE_URL="http://${ADDR}"
RESULT_FILE="scripts/result.txt"

if [ ! -x "bin/order-server" ] || [ ! -x "bin/order-cli" ]; then
	./scripts/build.sh
fi

./bin/order-server -addr "${ADDR}" -result "${RESULT_FILE}" &
SERVER_PID=$!
trap 'kill ${SERVER_PID} 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
	if curl -fsS "${BASE_URL}/healthz" >/dev/null 2>&1; then
		break
	fi
	sleep 0.1
done

echo "Add normal order"
./bin/order-cli '{"action":"add","object":"orders","type":"normal"}'
sleep 1
echo "Add VIP order"
./bin/order-cli '{"action":"add","object":"orders","type":"vip"}'
echo "Add normal order"
./bin/order-cli '{"action":"add","object":"orders","type":"normal"}'
sleep 1
echo "Add bot"
./bin/order-cli '{"action":"add","object":"bots"}'
sleep 1
echo "Add bot"
./bin/order-cli '{"action":"add","object":"bots"}'
sleep 11
echo "Add VIP order"
./bin/order-cli '{"action":"add","object":"orders","type":"vip"}'
sleep 11
echo "Remove bot"
./bin/order-cli '{"action":"remove","object":"bots"}'
sleep 1
echo "Finalize"
./bin/order-cli '{"action":"finalize"}'

echo "CLI application execution completed"