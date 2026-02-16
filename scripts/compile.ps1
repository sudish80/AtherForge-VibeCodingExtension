# Atherforge TypeScript Compilation Script
# Bypasses PowerShell execution policy to compile TypeScript
# Usage: .\scripts\compile.ps1 [-Mode "development" | "production"]

param(
    [string]$Mode = "development",
    [switch]$Watch = $false,
    [switch]$Verbose = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$SuccessColor = "Green"
$ErrorColor = "Red"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host "Atherforge TypeScript Compilation Script" -ForegroundColor $InfoColor
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host ""

# Get project root directory
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "[INFO] Project Root: $ProjectRoot" -ForegroundColor $InfoColor
Write-Host "[INFO] Mode: $Mode" -ForegroundColor $InfoColor
Write-Host "[INFO] Watch Mode: $Watch" -ForegroundColor $InfoColor

# Check if node_modules exists
if (-not (Test-Path "$ProjectRoot\node_modules")) {
    Write-Host "[ERROR] node_modules not found. Installing dependencies..." -ForegroundColor $WarningColor
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed!" -ForegroundColor $ErrorColor
        exit 1
    }
}

# Check if TypeScript is installed
$tscPath = "$ProjectRoot\node_modules\.bin\tsc.cmd"
if (-not (Test-Path $tscPath)) {
    Write-Host "[ERROR] TypeScript not found. Installing..." -ForegroundColor $WarningColor
    & npm install --save-dev typescript
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install typescript failed!" -ForegroundColor $ErrorColor
        exit 1
    }
}

# Prepare tsconfig based on mode
$tsConfigPath = "$ProjectRoot\tsconfig.json"
Write-Host "[INFO] Using tsconfig: $tsConfigPath" -ForegroundColor $InfoColor

if (-not (Test-Path $tsConfigPath)) {
    Write-Host "[ERROR] tsconfig.json not found!" -ForegroundColor $ErrorColor
    exit 1
}

# Compile TypeScript
Write-Host ""
Write-Host "[BUILD] Starting TypeScript compilation..." -ForegroundColor $InfoColor
Write-Host ""

try {
    if ($Watch) {
        Write-Host "[BUILD] Watch mode enabled. Press Ctrl+C to stop." -ForegroundColor $WarningColor
        Write-Host ""
        & npx tsc -p ./ --watch
    } else {
        $startTime = Get-Date
        & npx tsc -p ./
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[SUCCESS] TypeScript compilation completed successfully!" -ForegroundColor $SuccessColor
            Write-Host "[SUCCESS] Duration: $duration seconds" -ForegroundColor $SuccessColor
            
            # Verify output files
            $outDir = "$ProjectRoot\out"
            if (Test-Path "$outDir\extension.js") {
                $fileSize = (Get-Item "$outDir\extension.js").Length / 1KB
                Write-Host "[SUCCESS] Output: $outDir\extension.js ($([Math]::Round($fileSize, 2))KB)" -ForegroundColor $SuccessColor
            }
            
            Write-Host ""
            Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
            Write-Host "✅ Build completed successfully!" -ForegroundColor $SuccessColor
            Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
            exit 0
        } else {
            Write-Host ""
            Write-Host "[ERROR] TypeScript compilation failed!" -ForegroundColor $ErrorColor
            Write-Host "[ERROR] Exit code: $LASTEXITCODE" -ForegroundColor $ErrorColor
            Write-Host ""
            Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $ErrorColor
            Write-Host "❌ Build failed!" -ForegroundColor $ErrorColor
            Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $ErrorColor
            exit 1
        }
    }
} catch {
    Write-Host "[ERROR] Compilation error: $_" -ForegroundColor $ErrorColor
    exit 1
}
