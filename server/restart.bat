@echo off
echo Stopping existing server on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 >nul
echo Starting fresh server...
node index.js
