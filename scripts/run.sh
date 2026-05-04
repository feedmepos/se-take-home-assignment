#!/bin/bash

cd "$(dirname "$0")/.."

echo "Starting API server..."

./order-controller > scripts/result.txt 2>&1 &
SERVER_PID=$!

sleep 2

if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "Server failed to start"
    cat scripts/result.txt
    exit 1
fi

echo "Server started (PID: $SERVER_PID)"

BASE_URL="http://localhost:8080"

log() {
    echo "[$(date +%H:%M:%S)] $1" | tee -a scripts/result.txt
}

log ""
log "=== McDonald's Order Controller API Demo ==="

log "Health check..."
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" >> scripts/result.txt
echo "" >> scripts/result.txt

log "Creating orders..."
curl -s -X POST "$BASE_URL/orders/normal"
curl -s -X POST "$BASE_URL/orders/normal"
curl -s -X POST "$BASE_URL/orders/vip"
curl -s -X POST "$BASE_URL/orders/vip"

log "Get pending orders:"
curl -s "$BASE_URL/orders?status=pending" | jq '.orders[] | "\(.id): \(.type)"' >> scripts/result.txt

log "Adding bot..."
curl -s -X POST "$BASE_URL/bots"

log "Status:"
curl -s "$BASE_URL/status" | jq -c '{bots: [.bots[].id], pending: [.pending[].id]}' >> scripts/result.txt

log "Waiting 25s for processing..."
sleep 25

log "Final status:"
curl -s "$BASE_URL/status" | jq -c '{bots: [.bots[].id], completed: [.completed[].id]}' >> scripts/result.txt

log "=== Demo Complete ==="

kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "Completed"
