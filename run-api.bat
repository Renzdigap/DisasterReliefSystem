@echo off
title DRRMS Java JDBC REST API Server (Port 8080)
echo ==================================================================
echo   Starting DRRMS Java JDBC REST Server (Port 8080)
echo   Connecting to Supabase PostgreSQL 15...
echo ==================================================================
if not exist "bin" mkdir "bin"
dir /s /b src\main\java\*.java > sources.txt
javac -encoding UTF-8 -cp "lib\postgresql-42.7.3.jar" -d bin @sources.txt
del sources.txt
java -cp "lib\postgresql-42.7.3.jar;bin" disasterrelief.api.ApiServer
pause
