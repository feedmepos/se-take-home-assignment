# Quick Start Guide

## Testing Locally (Before Push)

### 1. Install Dependencies
```bash
cd C:\Users\akid\Documents\GitHub\se-take-home-assignment
npm install
```

### 2. Run Tests
```bash
npm test
```
Should show all tests passing ✅

### 3. Run the Simulation
```bash
node index.js
```
You should see timestamped output with the order processing flow.

### 4. Test with Scripts
```bash
# Make scripts executable (Git Bash or WSL)
chmod +x scripts/*.sh

# Or run directly
bash scripts/build.sh
bash scripts/test.sh
bash scripts/run.sh
```

### 5. Check result.txt
```bash
cat scripts/result.txt
```
Should contain timestamped simulation output.

## Submitting Your Work

### 1. Check Current Branch
```bash
git branch
```

### 2. Create Your Branch (if not already on one)
```bash
git checkout -b naqi/take-home-assignment
```

### 3. Add Files
```bash
git add .
```

### 4. Commit
```bash
git commit -m "feat: implement Node.js order controller with bot management

- Add OrderController class with VIP priority queue
- Implement bot lifecycle management
- Add comprehensive unit tests with Jest
- Create CLI simulation with timestamped output
- Add build/test/run scripts for GitHub Actions
"
```

### 5. Push
```bash
git push origin naqi/take-home-assignment
```

### 6. Create Pull Request
1. Go to GitHub repository
2. Click "Pull Requests"
3. Click "New Pull Request"
4. Select your branch
5. Create PR and wait for GitHub Actions to run ✅

## Troubleshooting

### Tests Failing?
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm test
```

### Scripts Not Executable?
```bash
# Use bash directly
bash scripts/test.sh
bash scripts/build.sh
bash scripts/run.sh
```

### Want to See Different Scenario?
Edit `index.js` to modify the simulation flow!

## What Gets Checked in GitHub Actions

1. ✅ Node.js setup
2. ✅ Scripts are executable
3. ✅ Tests pass (`scripts/test.sh`)
4. ✅ Build succeeds (`scripts/build.sh`)
5. ✅ CLI runs (`scripts/run.sh`)
6. ✅ `result.txt` exists and has timestamps

## Files Created

```
se-take-home-assignment/
├── OrderController.js       # Main controller class
├── OrderController.test.js  # Unit tests
├── index.js                 # CLI application
├── package.json             # Node.js dependencies
├── jest.config.js          # Jest configuration
├── .gitignore              # Git ignore file
├── IMPLEMENTATION.md        # Full documentation
├── QUICKSTART.md           # This file
└── scripts/
    ├── build.sh            # Build script
    ├── test.sh             # Test script
    ├── run.sh              # Run script
    └── result.txt          # Output (generated)
```

Good luck! 🚀
