# Atherforge Build Scripts

Complete build and development automation for Atherforge TypeScript VS Code Extension.

## 🎯 Quick Start

### First Time Setup
```bash
# PowerShell (Windows)
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1 -Mode development

# Or use batch file
scripts\setup.bat
```

### Development (Watch Mode)
```bash
# PowerShell
powershell -ExecutionPolicy Bypass -File .\scripts\develop.ps1

# Or batch
scripts\develop.bat
```

### Production Build
```bash
# PowerShell
powershell -ExecutionPolicy Bypass -File .\scripts\build-production.ps1

# Or batch
scripts\build.bat production
```

---

## 📁 Directory Structure

```
scripts/
├── compile.ps1              # TypeScript compilation (supports watch mode)
├── compile.bat              # Windows batch wrapper for compile.ps1
├── develop.ps1              # Development environment runner
├── develop.bat              # Windows batch wrapper for develop.ps1
├── build-production.ps1     # Production build with validation
├── setup.ps1                # Project initialization
├── run.ps1                  # Universal script runner
└── README.md                # This file

config/
├── development.json         # Development environment config
├── production.json          # Production environment config
└── build.json              # Build system configuration
```

---

## 🛠️ Available Scripts

### 1. **setup.ps1** - Project Initialization
Initialize the project for development or production.

**Usage:**
```powershell
.\scripts\setup.ps1 [-Mode "development" | "production"]
```

**What it does:**
- Verifies system requirements (Node.js, npm)
- Installs project dependencies
- Creates required directories (`.atherforge/`, `logs/`, etc.)
- Creates environment configuration files (`.env`)
- Initial TypeScript compilation
- Configures `.gitignore` for sensitive files

**Example:**
```powershell
# Development setup
.\scripts\setup.ps1 -Mode development

# Production setup
.\scripts\setup.ps1 -Mode production
```

---

### 2. **compile.ps1** - TypeScript Compilation
Fast, reliable TypeScript compilation with proper error handling.

**Usage:**
```powershell
.\scripts\compile.ps1 [-Mode "development" | "production"] [-Watch] [-Verbose]
```

**Options:**
- `-Mode`: Build mode (default: `development`)
- `-Watch`: Enable watch mode for continuous compilation
- `-Verbose`: Detailed build output

**What it does:**
- Checks for Node.js and npm
- Installs TypeScript if needed
- Compiles TypeScript with tsconfig.json
- Verifies output files generated
- Reports compilation time and size

**Examples:**
```powershell
# Single compilation
.\scripts\compile.ps1

# Watch mode (recompiles on file change)
.\scripts\compile.ps1 -Watch

# Production mode
.\scripts\compile.ps1 -Mode production

# Verbose output
.\scripts\compile.ps1 -Verbose
```

**Output:**
```
[INFO] Project Root: C:\Users\...\Vibe code
[BUILD] Starting TypeScript compilation...
[SUCCESS] TypeScript compilation completed successfully!
[SUCCESS] Duration: 3.45 seconds
[SUCCESS] Output: out\extension.js (64.82KB)
```

---

### 3. **compile.bat** - Windows Batch Wrapper
Cross-platform wrapper for compile.ps1 that bypasses PowerShell execution policy.

**Usage:**
```batch
scripts\compile.bat [mode] [--watch] [--verbose]
```

**Options:**
- `mode`: `development` or `production` (default: `development`)
- `--watch`: Enable watch mode
- `--verbose`: Verbose output

**Examples:**
```batch
# Simple compilation
scripts\compile.bat

# Production build with watch mode
scripts\compile.bat production --watch

# Development with verbose output
scripts\compile.bat development --verbose
```

**Why this file exists:**
- Works even if PowerShell execution policy is "Restricted"
- Automatically applies ExecutionPolicy Bypass
- No need to run PowerShell manually
- Works with regular Command Prompt (cmd.exe)

---

### 4. **develop.ps1** - Development Environment
Complete development environment with linting, type checking, and watch mode.

**Usage:**
```powershell
.\scripts\develop.ps1 [-NoTypeCheck] [-NoLint] [-Fast]
```

**Options:**
- `-NoTypeCheck`: Skip TypeScript validation
- `-NoLint`: Skip ESLint
- `-Fast`: Fast mode (no source maps)

**What it does:**
- Ensures dependencies are installed
- Runs ESLint on source code
- Starts TypeScript compiler in watch mode
- Maintains source maps for debugging
- Auto-recompiles on file change

**Example:**
```powershell
# Start development environment
.\scripts\develop.ps1

# Skip linting for faster startup
.\scripts\develop.ps1 -NoLint

# Fast mode (no source maps)
.\scripts\develop.ps1 -Fast

# Press Ctrl+C to stop
```

---

### 5. **build-production.ps1** - Production Build
Comprehensive production build with all validation checks.

**Usage:**
```powershell
.\scripts\build-production.ps1 [-Version "auto"] [-SkipTests] [-SkipLint]
```

**Options:**
- `-Version`: Custom version number (default: read from package.json)
- `-SkipTests`: Skip test execution
- `-SkipLint`: Skip linting

**What it does (5 steps):**
1. Installs production dependencies
2. Runs ESLint (must pass with 0 warnings)
3. Runs test suite (must pass)
4. Compiles TypeScript with type declarations
5. Verifies all build artifacts

**Process:**
```
Step 1/5: Installing dependencies
Step 2/5: Running ESLint
Step 3/5: Running tests
Step 4/5: Compiling TypeScript (production mode)
Step 5/5: Verifying build artifacts
```

**Examples:**
```powershell
# Standard production build
.\scripts\build-production.ps1

# Specific version
.\scripts\build-production.ps1 -Version "1.0.0"

# Skip tests (not recommended)
.\scripts\build-production.ps1 -SkipTests
```

---

### 6. **run.ps1** - Universal Script Runner
Execute any script with a simple, consistent interface.

**Usage:**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run.ps1 -Script <name> -Args <args>
```

**Available Scripts:**
| Script | Aliases | Purpose |
|--------|---------|---------|
| `compile` | `build` | Build TypeScript |
| `develop` | `dev` | Development mode |
| `production` | `prod` | Production build |
| `setup` | `init` | Initialize project |

**Examples:**
```powershell
# Compile
powershell -ExecutionPolicy Bypass -File .\scripts\run.ps1 -Script compile

# Development
powershell -ExecutionPolicy Bypass -File .\scripts\run.ps1 -Script develop

# Production
powershell -ExecutionPolicy Bypass -File .\scripts\run.ps1 -Script production

# Setup
powershell -ExecutionPolicy Bypass -File .\scripts\run.ps1 -Script setup -Args @("-Mode", "production")
```

---

## ⚙️ Configuration Files

### config/development.json
Development environment settings:
- Debug mode enabled
- Source maps enabled
- Optimization disabled
- Linting with auto-fix
- 70% minimum test coverage

### config/production.json
Production environment settings:
- Debug mode disabled
- Source maps disabled
- Optimization enabled
- Strict linting (0 warnings)
- 80% minimum test coverage

### config/build.json
Build system configuration:
- TypeScript compiler settings
- ESLint configuration
- Test framework settings
- Path mappings
- Execution settings

---

## 🔒 PowerShell Execution Policy Bypass

All scripts automatically bypass PowerShell execution policy:

**Direct PowerShell:**
```powershell
# This requires manual bypass
powershell -ExecutionPolicy Bypass -File .\scripts\compile.ps1
```

**Using Batch Wrapper (Recommended):**
```batch
# Automatically bypasses execution policy
scripts\compile.bat
```

**No Manual Bypass Needed:**
- Batch files handle policy bypass automatically
- Works even with "Restricted" execution policy
- No need to change system-wide policies

---

## 📊 Build Output

### Development Build
```
out/
├── extension.js         # Main extension code (unminified)
├── extension.js.map     # Source map for debugging
├── webview.js          # Webview code
└── webview.js.map      # Source map
```

### Production Build
```
build/
├── extension.js         # Main extension code (minified)
├── extension.d.ts       # Type declarations
├── extension.js.map     # Minimal source map
├── webview.js          # Webview code
└── webview.js.map      # Minimal source map
```

---

## ✅ Common Tasks

### Task: Quick Compile
```bash
scripts\compile.bat
```

### Task: Development with Auto-Reload
```powershell
.\scripts\develop.ps1
```

### Task: Production Release
```powershell
.\scripts\build-production.ps1 -Version "1.0.0"
```

### Task: Initialize New Workspace
```powershell
.\scripts\setup.ps1 -Mode development
```

### Task: Run Tests with Coverage
```bash
npm test -- --coverage
```

### Task: Fix Linting Issues
```bash
npm run lint -- --fix
```

---

## 🐛 Troubleshooting

### Issue: "ExecutionPolicy" Error
**Solution:** Use batch file wrapper:
```batch
scripts\compile.bat
```

### Issue: "npm: The term 'npm' is not recognized"
**Solution:** Ensure Node.js is installed and in PATH:
```powershell
node --version
npm --version
```

### Issue: "TypeScript command not found"
**Solution:** Reinstall dependencies:
```powershell
npm install
```

### Issue: Compilation takes too long
**Solution:** Use fast mode:
```powershell
.\scripts\compile.ps1 -Fast
```

### Issue: Tests fail on production build
**Solution:** Fix failing tests before production:
```bash
npm test
# Fix issues, then retry:
.\scripts\build-production.ps1
```

---

## 📝 Adding New Scripts

To add a new script:

1. Create `scripts/your-script.ps1`
2. Add entry to `$scriptMap` in `run.ps1`
3. Create batch wrapper if needed: `scripts/your-script.bat`
4. Document in this README

---

## 🎓 Best Practices

### For Development
- Always start with: `.\scripts\setup.ps1 -Mode development`
- Use: `.\scripts\develop.ps1` for continuous development
- Compile manually: `.\scripts\compile.ps1` when needed

### For Production Releases
- Always use: `.\scripts\build-production.ps1`
- Do NOT skip tests or linting
- Verify all artifacts before publishing
- Tag builds with version numbers

### For CI/CD Integration
- Use batch wrappers for maximum compatibility
- Parse output for error detection
- Log to files: `.\scripts\compile.bat > build.log 2>&1`
- Check exit codes: `$LASTEXITCODE`

---

## 📞 Support

For issues or questions about build scripts:
1. Check troubleshooting section above
2. Review script output for details
3. Check configuration files in `config/`
4. Run with `-Verbose` flag for debugging

---

**Status:** ✅ All scripts implemented, tested, and production-ready!
