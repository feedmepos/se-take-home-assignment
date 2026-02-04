#!/bin/bash
# Add local Go to PATH
export PATH=$PATH:$(pwd)/tools/go/bin

TEST_EXIT_CODE=0

echo "Running Backend Tests..."
cd backend
if command -v go &> /dev/null; then
    go test ./... -v
    if [ $? -ne 0 ]; then
        echo "Backend tests failed!"
        TEST_EXIT_CODE=1
    fi
else
    echo "Warning: 'go' command not found. Skipping backend tests."
fi
cd ..

echo "Running Frontend Tests..."
cd frontend
if command -v npm &> /dev/null; then
    npm test
    if [ $? -ne 0 ]; then
        echo "Frontend tests failed!"
        TEST_EXIT_CODE=1
    fi
else
    echo "Warning: 'npm' command not found. Skipping frontend tests."
fi
cd ..

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "All tests passed!"
else
    echo "Some tests failed."
fi

exit $TEST_EXIT_CODE
