@echo off
cd /d "%~dp0"
title Grok Agent

set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Node.js is missing. Installing is required once.
  echo  Opening https://nodejs.org ...
  start https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\express\" (
  echo First-time setup...
  call "%ProgramFiles%\nodejs\npm.cmd" install --silent 2>nul
  if not exist "node_modules\express\" call npm.cmd install --silent
)

REM Always use launcher (starts server if needed, opens browser)
node launch.mjs
if errorlevel 1 (
  echo.
  echo  Could not start Grok. Trying direct server...
  start "Grok Agent Server" /min cmd /c "cd /d "%~dp0" && node server.mjs"
  timeout /t 3 /nobreak >nul
  start "" "http://127.0.0.1:3847"
  echo  If the page is blank, wait 5 seconds and refresh.
  timeout /t 4 /nobreak >nul
)
exit /b 0
