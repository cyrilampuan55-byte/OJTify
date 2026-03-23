@echo off
setlocal

set "SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\OJTify.lnk"

if exist "%SHORTCUT%" (
  del "%SHORTCUT%"
  echo Removed OJTify auto-start.
) else (
  echo OJTify auto-start shortcut was not found.
)

pause
