@echo off
setlocal
title Niyun Zhitan FC Packager

cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm was not found. Install Node.js 20.19+ or 22.12+ and try again.
  goto :failed
)

echo [INFO] Building and packaging the latest FC release...
echo.
call npm run package:fc
if errorlevel 1 goto :failed

echo.
echo [SUCCESS] FC archive created:
echo   %CD%\releases\niyun-zhitan-fc.zip
echo.
pause
exit /b 0

:failed
set "EXIT_CODE=%ERRORLEVEL%"
if "%EXIT_CODE%"=="0" set "EXIT_CODE=1"
echo.
echo [ERROR] Packaging failed with exit code %EXIT_CODE%.
echo Review the messages above, then try again.
echo.
pause
exit /b %EXIT_CODE%
