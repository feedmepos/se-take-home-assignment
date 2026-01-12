# Backend CLI Application

This backend implements a CLI application that can be executed in GitHub Actions as required by the assignment.

## Requirements Met

✅ **CLI Application**: The backend is a CLI application (not just an API server)  
✅ **GitHub Actions Compatible**: All scripts work in CI/CD environment  
✅ **Scripts in `scripts/` directory**:
  - `test.sh`: Unit test execution steps
  - `build.sh`: Compilation steps for the CLI application
  - `run.sh`: Execution steps that run the CLI application
✅ **Output to result.txt**: CLI output is written to `scripts/result.txt`  
✅ **Timestamps in HH:MM:SS format**: All log entries include timestamps like `[15:45:17]`

## Scripts

### `scripts/test.sh`
- Builds the TypeScript project
- Runs unit tests using Node.js built-in test runner
- Exits with error code if tests fail

### `scripts/build.sh`
- Installs dependencies (yarn or npm)
- Compiles TypeScript to JavaScript
- Verifies build output exists
- Exits with error code if build fails

### `scripts/run.sh`
- Ensures project is built
- Runs the compiled CLI application (`node dist/cli.js`)
- Outputs to `scripts/result.txt`
- Works in GitHub Actions environment

## CLI Application

The CLI application (`src/cli.ts`) simulates the order management system:
- Creates orders (Normal/VIP)
- Manages bots
- Processes orders with 10-second delays
- Outputs all events with timestamps

## Output Format

The `result.txt` file contains:
- Header: "McDonald's Order Management System - Simulation Results"
- Timestamped log entries: `[HH:MM:SS] Message`
- Final status summary

Example output:
```
McDonald's Order Management System - Simulation Results

[15:45:17] System initialized with 0 bots
[15:45:18] Created NORMAL Order #1001 - Status: PENDING
[15:45:19] Created VIP Order #1002 - Status: PENDING
...
[15:45:50] Final Status:
[15:45:50] - Total Orders Processed: 4 (2 VIP, 2 Normal)
[15:45:50] - Orders Completed: 4
[15:45:50] - Active Bots: 0
[15:45:50] - Pending Orders: 0
```

## GitHub Actions

The existing workflow (`.github/workflows/backend-verify-result.yaml`) will:
1. Set up Node.js environment
2. Make scripts executable
3. Run `test.sh`, `build.sh`, and `run.sh`
4. Verify `result.txt` exists, is not empty, and contains timestamps

## Running Locally

```bash
# Run tests
bash scripts/test.sh

# Build application
bash scripts/build.sh

# Run CLI and generate result.txt
bash scripts/run.sh

# View output
cat scripts/result.txt
```

## Verification

The scripts are designed to:
- Exit with error codes on failure (for CI/CD)
- Work with both yarn and npm
- Handle missing dependencies gracefully
- Verify build outputs exist
- Generate properly formatted output with timestamps

