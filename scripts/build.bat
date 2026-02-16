@echo off
REM Atherforge Production Build Script
REM Comprehensive production build with validation
REM Usage: build.bat [version] [--skip-tests] [--skip-lint]

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..

set VERSION=auto
set ARGS=

:parse_args
if "%~1"=="" goto args_done
if "%~1"=="--skip-tests" (
    set ARGS=!ARGS! -SkipTests
    shift
    goto parse_args
)
if "%~1"=="--skip-lint" (
    set ARGS=!ARGS! -SkipLint
    shift
    goto parse_args
)
if not "%~1"=="" (
    set VERSION=%~1
    shift
    goto parse_args
)

:args_done

echo.
echo ============================================================
echo Atherforge Production Build
echo ============================================================
echo.
echo [BUILD] Version: %VERSION%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%build-production.ps1" -Version "%VERSION%" %ARGS%

set EXIT_CODE=!errorlevel!

if !EXIT_CODE! equ 0 (
    echo.
    echo ============================================================
    echo [SUCCESS] Production build completed successfully!
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo [ERROR] Production build failed with exit code !EXIT_CODE!
    echo ============================================================
)

exit /b !EXIT_CODE!
