@echo off
REM Atherforge Setup Script
REM Initializes project for development or production
REM Usage: setup.bat [development | production]

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..

set MODE=development
if not "%~1"=="" set MODE=%~1

echo.
echo ============================================================
echo Atherforge Project Setup
echo ============================================================
echo.
echo [SETUP] Mode: %MODE%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%setup.ps1" -Mode "%MODE%"

set EXIT_CODE=!errorlevel!

if !EXIT_CODE! equ 0 (
    echo.
    echo ============================================================
    echo [SUCCESS] Setup completed successfully!
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo [ERROR] Setup failed with exit code !EXIT_CODE!
    echo ============================================================
)

exit /b !EXIT_CODE!
