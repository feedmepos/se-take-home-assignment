#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "Building CLI application..."
export GOCACHE="${GOCACHE:-/tmp/se-order-gocache}"
go build -o "${PROJECT_ROOT}/scripts/orderctl" "${PROJECT_ROOT}/src/cmd/orderctl"

for input_file in "${SCRIPT_DIR}"/input*.txt; do
  base_name="$(basename "${input_file}" .txt)"
  output_file="${SCRIPT_DIR}/result_${base_name}.txt"
  echo "Running ${input_file} -> ${output_file}"
  "${PROJECT_ROOT}/scripts/orderctl" -input-file "${input_file}" -output-file "${output_file}"
done

echo "Completed all scripted runs"
