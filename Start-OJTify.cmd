@echo off
setlocal

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found in PATH.
  echo Install Node.js, then try again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting OJTify...
call npm run start:desktop

if errorlevel 1 (
  echo OJTify stopped with an error.
  pause
)
