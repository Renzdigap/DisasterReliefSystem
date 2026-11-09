@echo off
title Launch DRRMS (Local Web + Java JDBC)
cd /d "%~dp0"
echo ==================================================================
echo   Disaster Risk Reduction and Relief Management System (DRRMS)
echo   Launching Local Java JDBC REST Server + Next.js Web Portal...
echo ==================================================================
echo 1. Launching Java JDBC REST Server on Port 8080...
start "DRRMS Java JDBC Server (8080)" cmd /c run-api.bat

timeout /t 3 /nobreak >nul

echo 2. Launching Next.js Web Portal on Port 3000...
start "DRRMS Web Portal (3000)" cmd /c run-web.bat

echo ==================================================================
echo   Both services are launching in separate windows!
echo   Open your browser at: http://localhost:3000
echo ==================================================================
pause
