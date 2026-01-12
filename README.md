## Setup and Run Guide

This guide will help you set up and run the backend CLI application.

### Prerequisites

- **Node.js**: Version 18 or higher
- **Package Manager**: Yarn (recommended) or npm
- **Operating System**: macOS, Linux, or Windows (with WSL/Git Bash)

### Quick Start

1. **Clone or navigate to the repository**
   ```bash
   cd se-take-home-assignment
   ```

2. **Set up environment variables** (optional, has defaults)
   ```bash
   # Run the setup script
   ./setup-env.sh
   
   # Or manually copy the example files
   cp feedme-backend/.env.example feedme-backend/.env
   ```

3. **Install dependencies**
   ```bash
   cd feedme-backend
   yarn install
   # or: npm install
   ```

4. **Build the application**
   ```bash
   # From project root
   bash scripts/build.sh
   
   # Or from feedme-backend directory
   cd feedme-backend
   yarn build
   ```

5. **Run tests** (optional)
   ```bash
   # From project root
   bash scripts/test.sh
   
   # Or from feedme-backend directory
   cd feedme-backend
   yarn build
   node --test dist/services/OrderController.test.js
   ```

6. **Run the CLI application**
   ```bash
   # From project root (recommended)
   bash scripts/run.sh
   
   # Or from feedme-backend directory
   cd feedme-backend
   node dist/cli.js > ../scripts/result.txt
   ```

7. **View the results**
   ```bash
   cat scripts/result.txt
   ```

### Scripts Overview

The project includes three main scripts in the `scripts/` directory:

#### `scripts/build.sh`
- Installs dependencies (yarn or npm)
- Compiles TypeScript to JavaScript
- Verifies build output exists
- **Usage**: `bash scripts/build.sh`

#### `scripts/test.sh`
- Builds the project if needed
- Runs unit tests using Node.js built-in test runner
- **Usage**: `bash scripts/test.sh`

#### `scripts/run.sh`
- Ensures project is built
- Runs the compiled CLI application
- Outputs to `scripts/result.txt`
- **Usage**: `bash scripts/run.sh`

### Expected Output

After running `scripts/run.sh`, you should see `scripts/result.txt` with content like:

```
McDonald's Order Management System - Simulation Results

[15:45:17] System initialized with 0 bots
[15:45:18] Created NORMAL Order #1001 - Status: PENDING
[15:45:19] Created VIP Order #1002 - Status: PENDING
[15:45:21] Bot #1 created - Status: ACTIVE
[15:45:21] Bot #1 picked up VIP Order #1002 - Status: PROCESSING
...
[15:45:50] Final Status:
[15:45:50] - Total Orders Processed: 4 (2 VIP, 2 Normal)
[15:45:50] - Orders Completed: 4
[15:45:50] - Active Bots: 0
[15:45:50] - Pending Orders: 0
```

### Running the API Server (Optional)

If you want to run the REST API server instead of the CLI:

```bash
cd feedme-backend

# Development mode (with hot reload)
yarn dev:api

# Production mode
yarn build
yarn start:api
```

The API server will run on `http://localhost:3000` (or the port specified in `.env`).

### Environment Variables

The backend uses the following environment variables (all optional with defaults):

- `PORT`: Server port (default: `3000`)
- `JWT_SECRET`: Secret key for JWT tokens (default: `your-secret-key-change-in-production`)

See `ENV_SETUP.md` for detailed environment variable documentation.

### Troubleshooting

**Issue: Scripts are not executable**
```bash
chmod +x scripts/*.sh
```

**Issue: Build fails**
- Ensure Node.js 18+ is installed: `node --version`
- Clear node_modules and reinstall: `rm -rf node_modules && yarn install`

**Issue: Tests fail**
- Ensure the project is built: `bash scripts/build.sh`
- Check that test files exist: `ls feedme-backend/dist/services/*.test.js`

**Issue: result.txt is empty**
- Check that the build completed successfully
- Verify `dist/cli.js` exists: `ls feedme-backend/dist/cli.js`
- Run manually to see errors: `cd feedme-backend && node dist/cli.js`

### GitHub Actions

The project is configured to run in GitHub Actions. The workflow (`.github/workflows/backend-verify-result.yaml`) will:
1. Set up Node.js environment
2. Make scripts executable
3. Run `test.sh`, `build.sh`, and `run.sh`
4. Verify `result.txt` exists, is not empty, and contains timestamps in `HH:MM:SS` format

### Tips on completing this task
- Testing, testing and testing. Make sure the prototype is functioning and meeting all the requirements.
- Treat this assignment as a vibe coding, don't over engineer it. Try to scope your working hour within 30 min. However, ensure you read and understand what your code doing.
- Complete the implementation as clean as possible, clean code is a strong plus point, do not bring in all the fancy tech stuff.
