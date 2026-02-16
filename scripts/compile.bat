@echo off
REM Atherforge Build Script for Windows
REM Bypasses PowerShell Execution Policy
REM Usage: compile.bat [mode] [--watch] [--verbose]

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..

REM Parse arguments
set MODE=development
set WATCH_MODE=
set VERBOSE_MODE=

:parse_args
if "%~1"=="" goto args_done
if "%~1"=="--watch" (
    set WATCH_MODE=-Watch
    shift
    goto parse_args
)
if "%~1"=="--verbose" (
    set VERBOSE_MODE=-Verbose
    shift
    goto parse_args
)
if "%~1"=="production" (
    set MODE=production
    shift
    goto parse_args
)
if "%~1"=="development" (
    set MODE=development
    shift
    goto parse_args
)
shift
goto parse_args

:args_done

echo.
echo ============================================================
echo Atherforge Build System for Windows
echo ============================================================
echo.
echo [INFO] Project Root: %PROJECT_ROOT%
echo [INFO] Mode: %MODE%
if defined WATCH_MODE (
    echo [INFO] Watch Mode: Enabled
)

REM Check if PowerShell is available
powershell -Command "exit" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PowerShell is not available!
    exit /b 1
)

REM Execute PowerShell compilation script with bypass policy
echo [BUILD] Starting compilation with bypassed execution policy...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%compile.ps1" -Mode "%MODE%" %WATCH_MODE% %VERBOSE_MODE%

set COMPILE_EXIT_CODE=!errorlevel!

if !COMPILE_EXIT_CODE! equ 0 (
    echo.
    echo ============================================================
    echo [SUCCESS] Build completed successfully!
    echo ============================================================
    exit /b 0
) else (
    echo.
    echo ============================================================
    echo [ERROR] Build failed with exit code !COMPILE_EXIT_CODE!
    echo ============================================================
    exit /b !COMPILE_EXIT_CODE!
)
