# Commands

## Essential Commands

| Command | Description |
|---------|-------------|
| `go run ./cmd/main.go` | Run app (output to terminal **and** auto-saves to `scripts/result.txt`) |
| `go test ./... -v` | Run all tests with verbose output |
| `go test ./... -cover` | Run all tests with coverage report |
| `go build -o order-controller ./cmd/main.go` | Build binary |

## Scripts (for CI/CD)

| Script | Description |
|--------|-------------|
| `./scripts/test.sh` | Run unit tests |
| `./scripts/build.sh` | Build binary → `order-controller` |
| `./scripts/run.sh` | Run binary → `scripts/result.txt` |

## GitHub Actions

**Workflow:** `backend-verify-result`
**Triggers:** Pull request to `main`

**Pipeline steps:**

1. `./scripts/test.sh` — Run tests
2. `./scripts/build.sh` — Build binary
3. `./scripts/run.sh` — Execute and write to `result.txt`
4. Verify `result.txt` exists and contains `HH:MM:SS` timestamps

**Requirements for PR to pass:**

- All tests must pass
- `scripts/result.txt` must not be empty
- Output must include timestamps (e.g., `[11:06:01]`)
