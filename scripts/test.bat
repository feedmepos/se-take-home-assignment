@echo off
echo === Running McDonald's Order CLI Tests ===

:: Simulate interactive input (PowerShell compatible)
(
    echo normal
    echo vip
    echo addbot
    echo status
    echo rmbot
    echo exit
) | node src/index.js

:: Verify result.txt exists and contains key content
if exist result.txt (
    echo Checking result.txt content...
    findstr /C:"Created NORMAL Order" result.txt >nul 2>&1
    if errorlevel 1 (
        echo Test failed: result.txt missing "Created NORMAL Order"
        pause
        exit /b 1
    )
    findstr /C:"Created VIP Order" result.txt >nul 2>&1
    if errorlevel 1 (
        echo Test failed: result.txt missing "Created VIP Order"
        pause
        exit /b 1
    )
    findstr /C:"Added new Bot" result.txt >nul 2>&1
    if errorlevel 1 (
        echo Test failed: result.txt missing "Added new Bot"
        pause
        exit /b 1
    )
    echo Tests passed ✅
    pause
    exit /b 0
) else (
    echo Test failed: result.txt not generated
    pause
    exit /b 1
)