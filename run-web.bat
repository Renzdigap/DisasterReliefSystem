@echo off
setlocal EnableExtensions
title DRRMS Next.js Web Portal (Port 3000)
cd /d "%~dp0"

echo ==================================================================
echo   Starting DRRMS Next.js Web Application (Port 3000)
echo   Accessible at: http://localhost:3000
echo ==================================================================

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js / npm was not found on PATH.
    echo         Please install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)

cd /d "%~dp0web"
if not exist "node_modules" (
    echo Installing Next.js web dependencies first...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
)

call npm run dev
pause
