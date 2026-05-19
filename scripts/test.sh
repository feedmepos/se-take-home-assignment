#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Running unit tests..."

RACE_FLAG="-race"
CGO_ENABLED_VAL=$(go env CGO_ENABLED 2>/dev/null || echo "0")
if [ "${CGO_ENABLED_VAL}" != "1" ]; then
  echo "CGO disabled - running without -race"
  RACE_FLAG=""
fi

go test ./... -v ${RACE_FLAG} -count=1
echo "Unit tests completed"
