@echo off
REM Atherforge Development Environment Launcher
REM Bypasses PowerShell Execution Policy
REM Usage: develop.bat [--no-lint] [--fast]

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..

set ARGS=

:parse_args
if "%~1"=="" goto args_done
if "%~1"=="--no-lint" (
    set ARGS=!ARGS! -NoLint
    shift
    goto parse_args
)
if "%~1"=="--fast" (
    set ARGS=!ARGS! -Fast
    shift
    goto parse_args
)
shift
goto parse_args

:args_done

echo.
echo ============================================================
echo Atherforge Development Environment
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%develop.ps1" %ARGS%

set EXIT_CODE=!errorlevel!
exit /b !EXIT_CODE!
