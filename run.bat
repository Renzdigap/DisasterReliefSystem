@echo off
echo Compiling Disaster Relief System...
if not exist "bin" mkdir "bin"
dir /s /b src\main\java\*.java > sources.txt
javac -cp "lib\postgresql-42.7.3.jar" -d bin @sources.txt
del sources.txt
echo Running Application...
java -cp "lib\postgresql-42.7.3.jar;bin" disasterrelief.gui.main.Main
pause
