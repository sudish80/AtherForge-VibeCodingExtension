# Atherforge Environment Setup Script
# Initializes project for development or production
# Usage: .\scripts\setup.ps1 [-Mode "development" | "production"]

param(
    [ValidateSet("development", "production")]
    [string]$Mode = "development"
)

$ErrorActionPreference = "Stop"

$SuccessColor = "Green"
$ErrorColor = "Red"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host "Atherforge Project Setup" -ForegroundColor $InfoColor
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host ""

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "[SETUP] Mode: $Mode" -ForegroundColor $InfoColor
Write-Host "[SETUP] Project Root: $ProjectRoot" -ForegroundColor $InfoColor
Write-Host ""

# 1. Check system requirements
Write-Host "[SETUP] Checking system requirements..." -ForegroundColor $InfoColor

# Check Node.js
try {
    $nodeVersion = & node --version
    Write-Host "[SETUP] ✓ Node.js: $nodeVersion" -ForegroundColor $SuccessColor
} catch {
    Write-Host "[ERROR] Node.js not found! Please install Node.js 18+" -ForegroundColor $ErrorColor
    exit 1
}

# Check npm
try {
    $npmVersion = & npm --version
    Write-Host "[SETUP] ✓ npm: $npmVersion" -ForegroundColor $SuccessColor
} catch {
    Write-Host "[ERROR] npm not found!" -ForegroundColor $ErrorColor
    exit 1
}

# 2. Install dependencies
Write-Host ""
Write-Host "[SETUP] Installing dependencies (this may take a few minutes)..." -ForegroundColor $InfoColor

if ($Mode -eq "production") {
    & npm install --production
} else {
    & npm install
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed!" -ForegroundColor $ErrorColor
    exit 1
}

Write-Host "[SETUP] ✓ Dependencies installed" -ForegroundColor $SuccessColor

# 3. Create required directories
Write-Host ""
Write-Host "[SETUP] Creating project directories..." -ForegroundColor $InfoColor

$directories = @(
    ".atherforge",
    ".atherforge/presets",
    ".atherforge/history",
    "logs",
    "build"
)

foreach ($dir in $directories) {
    $fullPath = "$ProjectRoot\$dir"
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath | Out-Null
        Write-Host "[SETUP] ✓ Created: $dir" -ForegroundColor $SuccessColor
    } else {
        Write-Host "[SETUP] ✓ Exists: $dir" -ForegroundColor $SuccessColor
    }
}

# 4. Create configuration files if they don't exist
Write-Host ""
Write-Host "[SETUP] Configuring project..." -ForegroundColor $InfoColor

# Create .env if it doesn't exist
$envFile = "$ProjectRoot\.env"
if (-not (Test-Path $envFile)) {
    @"
# Atherforge Environment Configuration
NODE_ENV=$Mode
VSCODE_DEBUG=false

# Model Configuration (Add your API keys)
FRONTEND_CODE_LLAMA_API_KEY=
BACKEND_CLAUDE_API_KEY=
REASONING_LLAMA_API_KEY=

# GitHub Configuration
GITHUB_TOKEN=

# Build Configuration
BUILD_MODE=development
SOURCE_MAPS=true
"@ | Out-File $envFile -Encoding UTF8
    Write-Host "[SETUP] ✓ Created: .env" -ForegroundColor $SuccessColor
} else {
    Write-Host "[SETUP] ✓ Exists: .env" -ForegroundColor $SuccessColor
}

# Create .env.production if in production mode
if ($Mode -eq "production") {
    $envProdFile = "$ProjectRoot\.env.production"
    if (-not (Test-Path $envProdFile)) {
        @"
# Atherforge Production Configuration
NODE_ENV=production
VSCODE_DEBUG=false
BUILD_MODE=production
SOURCE_MAPS=false
"@ | Out-File $envProdFile -Encoding UTF8
        Write-Host "[SETUP] ✓ Created: .env.production" -ForegroundColor $SuccessColor
    }
}

# 5. Create .gitignore entries for sensitive files
Write-Host ""
Write-Host "[SETUP] Verifying .gitignore..." -ForegroundColor $InfoColor

$gitignorePath = "$ProjectRoot\.gitignore"
$requiredIgnores = @(
    ".env",
    ".env.local",
    ".env.*.local",
    "logs/",
    "build/",
    "*.log"
)

if (Test-Path $gitignorePath) {
    $gitignoreContent = Get-Content $gitignorePath
    $allPresent = $true
    
    foreach ($ignore in $requiredIgnores) {
        if ($gitignoreContent -notcontains $ignore) {
            Add-Content $gitignorePath "`n$ignore"
            $allPresent = $false
        }
    }
    
    if ($allPresent) {
        Write-Host "[SETUP] ✓ .gitignore is properly configured" -ForegroundColor $SuccessColor
    } else {
        Write-Host "[SETUP] ✓ Updated .gitignore with missing entries" -ForegroundColor $SuccessColor
    }
} else {
    Write-Host "[SETUP] ✓ No .gitignore found (assuming managed separately)" -ForegroundColor $WarningColor
}

# 6. Initial TypeScript compilation
Write-Host ""
Write-Host "[SETUP] Initial compilation..." -ForegroundColor $InfoColor

& npx tsc -p ./

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Initial TypeScript compilation failed!" -ForegroundColor $ErrorColor
    exit 1
}

Write-Host "[SETUP] ✓ TypeScript compilation successful" -ForegroundColor $SuccessColor

# 7. Setup complete
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $SuccessColor
Write-Host "✅ Setup completed successfully!" -ForegroundColor $SuccessColor
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $SuccessColor
Write-Host ""
Write-Host "Next steps:" -ForegroundColor $InfoColor
Write-Host "  1. Edit .env file with your API keys" -ForegroundColor $InfoColor
Write-Host "  2. For development: .\scripts\develop.ps1" -ForegroundColor $InfoColor
Write-Host "  3. For production: .\scripts\build-production.ps1" -ForegroundColor $InfoColor
Write-Host "  4. Run VS Code: code ." -ForegroundColor $InfoColor
Write-Host ""
