@echo off
title Super Tutor - Easy Install
color 0B
cls
echo.
echo  ============================================
echo   GROK SUPER TUTOR - Easy Install
echo   Grok is the teacher. This just installs.
echo  ============================================
echo.
cd /d "%~dp0"

REM --- Node.js ---
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"
where node >nul 2>&1
if errorlevel 1 (
  echo  Node.js is needed once ^(free^).
  echo  Opening download page...
  start https://nodejs.org
  echo.
  echo  1^) Install Node.js LTS ^(green button^)
  echo  2^) Close that window
  echo  3^) Double-click INSTALL-ME.bat again
  echo.
  pause
  exit /b 1
)

echo  [1/3] Installing files...
call npm.cmd install --silent 2>nul
if errorlevel 1 call npm.cmd install

echo  [2/3] Making desktop shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Grok-Agent.ps1" -NoStart
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Create-Desktop-Shortcut.ps1"
)

echo  [3/3] Starting Super Tutor...
start "" wscript.exe "%~dp0Start-Grok-Silent.vbs"

echo.
echo  ============================================
echo   DONE
echo   Look for "Grok Agent" on your Desktop.
echo   Double-click it anytime to learn with Grok.
echo.
echo   First time teaching: open a terminal and run
echo     grok login
echo   ^(uses YOUR Grok subscription^)
echo  ============================================
echo.
timeout /t 8
exit /b 0
