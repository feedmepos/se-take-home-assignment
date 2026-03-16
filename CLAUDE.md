# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **take-home assignment template** for FeedMe software engineer candidates. Candidates fork this repo and implement a McDonald's automated order management system as either a frontend or backend solution.

The system simulates cooking bots that process customer orders with priority queuing (VIP orders before normal orders), bot lifecycle management, and 10-second order processing time.

## Repository Structure

- `scripts/` — Contains the three required shell scripts and output file:
  - `build.sh` — Compilation steps (currently placeholder)
  - `test.sh` — Unit test execution (currently placeholder)
  - `run.sh` — Runs the CLI app, outputs to `scripts/result.txt`
  - `result.txt` — Sample expected output format with timestamps
- `.github/workflows/backend-verify-result.yaml` — CI workflow that runs on PRs to main

## Build & Run Commands

```bash
# Run the full pipeline (what CI does)
./scripts/test.sh && ./scripts/build.sh && ./scripts/run.sh

# Individual steps
./scripts/test.sh    # Run unit tests
./scripts/build.sh   # Compile/install
./scripts/run.sh     # Execute and generate result.txt
```

## CI/CD

The GitHub Actions workflow (`backend-verify-result`) runs on PRs to `main` and:
1. Sets up Go 1.23.9 and Node.js 22.19.0
2. Executes `test.sh`, `build.sh`, `run.sh` in sequence
3. Verifies `scripts/result.txt` exists, is non-empty, and contains timestamps in `HH:MM:SS` format

## Key Business Rules

- **Order priority**: VIP orders queue ahead of all normal orders but behind existing VIP orders
- **Order numbers**: Must be unique and increasing
- **Bot processing**: Each bot handles 1 order at a time, taking 10 seconds per order
- **Bot addition**: New bot immediately picks up a pending order if available
- **Bot removal**: Newest bot is destroyed first; if processing, its order returns to PENDING
- **Output format**: All lines in `result.txt` must include `HH:MM:SS` timestamps

## Implementation Constraints

- Backend must use **Go or Node.js**
- No data persistence required — all in-memory
- Candidates choose either frontend (any framework, deployed publicly) or backend (CLI app for GitHub Actions)
