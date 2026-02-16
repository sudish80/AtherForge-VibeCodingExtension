# Atherforge Production Build Script
# Optimized for release builds with comprehensive validation
# Usage: .\scripts\build-production.ps1

param(
    [string]$Version = "auto",
    [switch]$SkipTests = $false,
    [switch]$SkipLint = $false
)

$ErrorActionPreference = "Stop"

$SuccessColor = "Green"
$ErrorColor = "Red"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host "Atherforge Production Build" -ForegroundColor $InfoColor
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host ""

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# Get version from package.json if not specified
if ($Version -eq "auto") {
    $packageJson = Get-Content "$ProjectRoot\package.json" | ConvertFrom-Json
    $Version = $packageJson.version
}

Write-Host "[BUILD] Version: $Version" -ForegroundColor $InfoColor
Write-Host "[BUILD] Platform: $([System.Environment]::OSVersion.VersionString)" -ForegroundColor $InfoColor
Write-Host "[BUILD] Node: $(& node --version)" -ForegroundColor $InfoColor
Write-Host ""

# 1. Install dependencies
Write-Host "[BUILD] Step 1/5: Installing dependencies..." -ForegroundColor $InfoColor
if (-not (Test-Path "$ProjectRoot\node_modules")) {
    & npm install --production
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed!" -ForegroundColor $ErrorColor
        exit 1
    }
} else {
    Write-Host "[BUILD] Dependencies already installed" -ForegroundColor $SuccessColor
}

# 2. Run linter
if (-not $SkipLint) {
    Write-Host "[BUILD] Step 2/5: Running ESLint..." -ForegroundColor $InfoColor
    & npx eslint src --max-warnings 0
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Linting failed! Fix issues before production build." -ForegroundColor $ErrorColor
        exit 1
    }
    Write-Host "[BUILD] Linting passed" -ForegroundColor $SuccessColor
} else {
    Write-Host "[BUILD] Step 2/5: Skipping ESLint (--SkipLint)" -ForegroundColor $WarningColor
}

# 3. Run tests
if (-not $SkipTests) {
    Write-Host "[BUILD] Step 3/5: Running tests..." -ForegroundColor $InfoColor
    & npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Tests failed! Fix failing tests before production build." -ForegroundColor $ErrorColor
        exit 1
    }
    Write-Host "[BUILD] Tests passed" -ForegroundColor $SuccessColor
} else {
    Write-Host "[BUILD] Step 3/5: Skipping tests (--SkipTests)" -ForegroundColor $WarningColor
}

# 4. Compile TypeScript
Write-Host "[BUILD] Step 4/5: Compiling TypeScript (production mode)..." -ForegroundColor $InfoColor
$startTime = Get-Date
& npx tsc -p ./ --declaration --declarationMap --sourceMap
$endTime = Get-Date

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] TypeScript compilation failed!" -ForegroundColor $ErrorColor
    exit 1
}

$duration = ($endTime - $startTime).TotalSeconds
Write-Host "[BUILD] Compilation completed in $duration seconds" -ForegroundColor $SuccessColor

# 5. Verify build artifacts
Write-Host "[BUILD] Step 5/5: Verifying build artifacts..." -ForegroundColor $InfoColor

$outDir = "$ProjectRoot\out"
$requiredFiles = @("extension.js", "webview.js")
$allFilesExist = $true

foreach ($file in $requiredFiles) {
    if (Test-Path "$outDir\$file") {
        $size = (Get-Item "$outDir\$file").Length / 1KB
        Write-Host "[BUILD] ✓ $file ($([Math]::Round($size, 2))KB)" -ForegroundColor $SuccessColor
    } else {
        Write-Host "[ERROR] ✗ Missing $file" -ForegroundColor $ErrorColor
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "[ERROR] Build artifacts validation failed!" -ForegroundColor $ErrorColor
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $SuccessColor
Write-Host "✅ Production build completed successfully!" -ForegroundColor $SuccessColor
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $SuccessColor
Write-Host "[BUILD] Ready for packaging/publishing" -ForegroundColor $SuccessColor
Write-Host ""
