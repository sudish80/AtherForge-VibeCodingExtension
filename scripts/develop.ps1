# Atherforge Development Script
# Runs TypeScript compilation in watch mode with additional tooling
# Usage: .\scripts\develop.ps1

param(
    [switch]$NoTypeCheck = $false,
    [switch]$NoLint = $false,
    [switch]$Fast = $false
)

$ErrorActionPreference = "Stop"

# Colors
$SuccessColor = "Green"
$ErrorColor = "Red"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host "Atherforge Development Environment" -ForegroundColor $InfoColor
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host ""

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# Install dependencies if needed
if (-not (Test-Path "$ProjectRoot\node_modules")) {
    Write-Host "[SETUP] Installing dependencies..." -ForegroundColor $WarningColor
    & npm install
}

# Run linter if not skipped
if (-not $NoLint) {
    Write-Host ""
    Write-Host "[DEV] Running ESLint..." -ForegroundColor $InfoColor
    & npx eslint src --max-warnings 0 || Write-Host "[WARN] Lint issues found - continuing..." -ForegroundColor $WarningColor
} else {
    Write-Host "[DEV] Skipping ESLint (--NoLint)" -ForegroundColor $WarningColor
}

# Run TypeScript compiler in watch mode
Write-Host ""
Write-Host "[DEV] Starting TypeScript compiler in watch mode..." -ForegroundColor $InfoColor
Write-Host "[DEV] Press Ctrl+C to stop" -ForegroundColor $WarningColor
Write-Host ""

if ($Fast) {
    # Fast mode: only compile, skip source maps
    & npx tsc -p ./ --watch
} else {
    # Normal mode: compile with source maps
    & npx tsc -p ./ --watch --sourceMap
}
