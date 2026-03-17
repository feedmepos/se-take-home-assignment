@echo off
echo === Building McDonald's Order CLI Application ===

:: Check Node.js installation
node -v >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed. Please install Node.js and configure environment variables.
    pause
    exit /b 1
)

:: Initialize npm (if not initialized)
if not exist package.json (
    npm init -y
)

echo Build completed ✅
pause