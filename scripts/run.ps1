# Atherforge Universal Runner Script
# Handles execution on any Windows system, regardless of PowerShell execution policy
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\run.ps1 -Script "compile" [-Args "production", "--watch"]

param(
    [Parameter(Mandatory=$true)]
    [string]$Script,
    [string[]]$Args = @()
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ScriptsDir = $PSScriptRoot

Write-Host "Atherforge Script Runner" -ForegroundColor Cyan
Write-Host "Script: $Script" -ForegroundColor Cyan
if ($Args.Count -gt 0) {
    Write-Host "Arguments: $($Args -join ' ')" -ForegroundColor Cyan
}
Write-Host ""

# Map script names to actual files
$scriptMap = @{
    "compile"              = "compile.ps1"
    "build"                = "compile.ps1"
    "develop"              = "develop.ps1"
    "dev"                  = "develop.ps1"
    "production"           = "build-production.ps1"
    "prod"                 = "build-production.ps1"
    "setup"                = "setup.ps1"
    "init"                 = "setup.ps1"
}

$scriptFile = $scriptMap[$Script]
if (-not $scriptFile) {
    Write-Host "Error: Unknown script '$Script'" -ForegroundColor Red
    Write-Host "Available scripts: $($scriptMap.Keys -join ', ')" -ForegroundColor Yellow
    exit 1
}

$scriptPath = "$ScriptsDir\$scriptFile"
if (-not (Test-Path $scriptPath)) {
    Write-Host "Error: Script not found: $scriptPath" -ForegroundColor Red
    exit 1
}

# Execute the script
Write-Host "Executing: $scriptPath" -ForegroundColor Green
Write-Host ""

& $scriptPath @Args
