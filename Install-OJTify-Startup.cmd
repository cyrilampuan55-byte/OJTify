@echo off
setlocal

cd /d "%~dp0"

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP%\OJTify.lnk"
set "TARGET=%~dp0Start-OJTify-Silent.vbs"

echo Installing OJTify auto-start...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut('%SHORTCUT%'); " ^
  "$s.TargetPath = '%TARGET%'; " ^
  "$s.WorkingDirectory = '%~dp0'; " ^
  "$s.IconLocation = '%SystemRoot%\System32\shell32.dll,220'; " ^
  "$s.Save()"

if errorlevel 1 (
  echo Failed to install startup shortcut.
  pause
  exit /b 1
)

echo Installed. OJTify will start automatically when you log in.
pause
