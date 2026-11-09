@echo off
setlocal EnableExtensions
title DRRMS Java JDBC REST API Server (Port 8080)
cd /d "%~dp0"

echo ==================================================================
echo   Starting DRRMS Java JDBC REST Server (Port 8080)
echo   Connecting to Supabase PostgreSQL 15...
echo ==================================================================

where javac >nul 2>nul && goto :jdk_ready
for /d %%D in ("%USERPROFILE%\.p2\pool\plugins\org.eclipse.justj.openjdk.hotspot.jre.full.win32.x86_64_*") do (
    if exist "%%~fD\jre\bin\javac.exe" (
        set "PATH=%%~fD\jre\bin;%PATH%"
        goto :jdk_ready
    )
)
for /d %%D in ("C:\Program Files\Eclipse Adoptium\jdk-*" "C:\Program Files\Java\jdk-*" "C:\Program Files\Microsoft\jdk-*" "C:\Program Files\BellSoft\LibericaJDK-*") do (
    if exist "%%~fD\bin\javac.exe" (
        set "PATH=%%~fD\bin;%PATH%"
        goto :jdk_ready
    )
)
if defined JAVA_HOME if exist "%JAVA_HOME%\bin\javac.exe" (
    set "PATH=%JAVA_HOME%\bin;%PATH%"
    goto :jdk_ready
)

echo [ERROR] Java JDK compiler (javac) not found on PATH or standard folders.
echo         Install JDK 17+ or run inside Eclipse IDE.
pause
exit /b 1

:jdk_ready
if not exist "bin" mkdir "bin"
setlocal EnableDelayedExpansion
(for /r "src\main\java" %%F in (*.java) do (
    set "srcfile=%%~fF"
    echo "!srcfile:\=/!"
)) > sources.txt
endlocal

javac -encoding UTF-8 -cp "lib\postgresql-42.7.3.jar" -d bin @sources.txt
set "BUILD_ERR=%errorlevel%"
if exist "sources.txt" del "sources.txt"
if not "%BUILD_ERR%"=="0" (
    echo [ERROR] Java compilation failed!
    pause
    exit /b %BUILD_ERR%
)

java -cp "lib\postgresql-42.7.3.jar;bin" disasterrelief.api.ApiServer
pause
