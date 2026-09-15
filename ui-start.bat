@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ui-start.ps1" %*
if not "%errorlevel%"=="0" (
  echo.
  echo GATE UI failed to start. The error is shown above.
  pause
)
exit /b %errorlevel%
