# File Management & Project Structure

Complete guide to Atherforge project organization, file naming conventions, and directory structure.

---

## 📁 Directory Structure

```
atherforge/
├── .github/                           # GitHub configuration
│   ├── copilot-instructions.md       # Development guidelines
│   └── workflows/                    # CI/CD workflows (future)
│
├── .vscode/                          # VS Code settings
│   └── launch.json                   # Debug configuration
│
├── src/                              # TypeScript source code
│   ├── extension.ts                  # Main extension entry point
│   └── webview.ts                    # Webview UI code
│
├── out/                              # Compiled JavaScript (dev/debug)
│   ├── extension.js                  # Compiled main extension
│   ├── extension.js.map              # Source map for debugging
│   ├── webview.js                    # Compiled webview
│   └── webview.js.map                # Source map
│
├── build/                            # Production build output
│   ├── extension.js                  # Minified/optimized main
│   ├── extension.d.ts                # TypeScript declarations
│   ├── webview.js                    # Minified/optimized webview
│   └── webview.d.ts                  # TypeScript declarations
│
├── .atherforge/                      # Runtime configuration & data
│   ├── presets/                      # Workflow presets
│   │   ├── auth-system.json          # Pre-configured workflow
│   │   └── database-migration.json   # Pre-configured workflow
│   ├── history/                      # User action history
│   │   ├── Nov-2025/                 # Monthly organized
│   │   └── Dec-2025/
│   ├── prompt-analytics.jsonl        # AI prompt tracking
│   ├── push-audit.jsonl              # Git push audit trail
│   └── quality-metrics.json          # Code quality scores
│
├── logs/                             # Application logs
│   ├── error-fixes.csv               # Error tracking
│   ├── github-commits.csv            # GitHub operations
│   ├── extension.log                 # Main extension log
│   └── 2026-02-16/                   # Daily organized logs
│
├── scripts/                          # Build & automation scripts
│   ├── compile.ps1                   # TypeScript compilation
│   ├── compile.bat                   # Batch wrapper
│   ├── develop.ps1                   # Development mode
│   ├── develop.bat                   # Batch wrapper
│   ├── build-production.ps1          # Production build
│   ├── build.bat                     # Batch wrapper
│   ├── setup.ps1                     # Project initialization
│   ├── setup.bat                     # Batch wrapper
│   ├── run.ps1                       # Universal runner
│   └── README.md                     # Scripts documentation
│
├── config/                           # Configuration files
│   ├── development.json              # Dev environment config
│   ├── production.json               # Prod environment config
│   └── build.json                    # Build system config
│
├── media/                            # UI assets
│   ├── atherforge.svg                # Extension icon
│   └── *.png                         # Screenshots/graphics
│
├── docs/                             # Documentation
│   ├── GITHUB_PUSH_WORKFLOW.md       # Git push features
│   ├── CODE_QUALITY_ANALYSIS.md      # Code analysis guide
│   ├── FILE_SECURITY.md              # File security guide
│   ├── COMMAND_INJECTION_PREVENTION.md # Command safety
│   ├── IMPLEMENTATION_SUMMARY.md     # Feature overview
│   └── ARCHITECTURE.md               # System design (future)
│
├── node_modules/                     # NPM dependencies
│   └── (automatically generated)
│
├── .git/                             # Git repository
│
├── .gitignore                        # Git ignore rules
├── .env                              # Environment variables (local)
├── .env.example                      # Environment template
├── .env.production                   # Production config
│
├── package.json                      # Project metadata & scripts
├── package-lock.json                 # Dependency lock file
├── tsconfig.json                     # TypeScript configuration
├── eslint.config.mjs                 # Linting configuration
│
├── README.md                         # Main project README
├── CHANGELOG.md                      # Version history
└── .vscodeignore                     # Files to exclude from package
```

---

## 📋 File Naming Conventions

### Source Code Files
- **Use:** `camelCase` and `.ts` extension
- **Pattern:** `[featureName].ts`
- **Examples:**
  - `extension.ts` - Main entry point
  - `chatService.ts` - Service class
  - `githubIntegration.ts` - Feature module

### Configuration Files
- **Use:** `kebab-case` with `.json` or `.mjs` extension
- **Pattern:** `[config-name].json` or `eslint.config.mjs`
- **Examples:**
  - `development.json`
  - `tsconfig.json`
  - `eslint.config.mjs`

### Documentation Files
- **Use:** `UPPERCASE_SNAKE_CASE` with `.md` extension
- **Pattern:** `[FEATURE_NAME].md`
- **Examples:**
  - `FILE_SECURITY.md`
  - `CODE_QUALITY_ANALYSIS.md`
  - `GITHUB_PUSH_WORKFLOW.md`

### Data/Log Files
- **Use:** `lowercase` with descriptive names
- **Patterns:**
  - Analytics: `*.jsonl` (one JSON per line)
  - CSV: `*.csv` (comma-separated values)
  - Logs: `*.log` or organized by date

### Script Files
- **Use:** `lowercase` with `.ps1` (PowerShell) or `.bat` (Batch)
- **Pattern:** `[script-name].ps1` or `[script-name].bat`
- **Examples:**
  - `compile.ps1` / `compile.bat`
  - `setup.ps1` / `setup.bat`

### Directory Names
- **Use:** `lowercase` with hyphens
- **Pattern:** `[category-name]`
- **Examples:**
  - `.atherforge` - Runtime data
  - `node_modules` - Dependencies
  - `build` - Build output

---

## 🔄 File Organization Principles

### 1. **Separation of Concerns**
| Directory | Purpose | Permissions |
|-----------|---------|-------------|
| `src/` | Source code | Developers edit |
| `out/` | Dev builds | Auto-generated |
| `build/` | Production | CI/CD only |
| `scripts/` | Automation | CI/CD + Dev |
| `config/` | Settings | Version controlled |
| `.atherforge/` | Runtime data | User + system |
| `logs/` | Activity | Read-only for users |

### 2. **Version Control Policy**
```
COMMITTED TO GIT:
✓ Source code (src/)
✓ Configuration (config/, tsconfig.json)
✓ Documentation (docs/, *.md)
✓ Scripts (scripts/)
✓ Package metadata (package.json, .gitignore)

NOT COMMITTED (in .gitignore):
✗ Environment variables (.env, .env.*.local)
✗ API Keys (in .env)
✗ Node modules (node_modules/)
✗ Build outputs (out/, build/)
✗ Logs (logs/)
✗ User history (.atherforge/history/)
```

### 3. **Build Output Hierarchy**
```
Development Build (out/):
- Fast, incremental compilation
- Source maps included
- No optimization
- Used for testing/debugging

Production Build (build/):
- Single pass compilation
- Minified/optimized
- Type declarations
- Source maps optional
- Ready for distribution
```

---

## 📝 Configuration File Organization

### Development Config (`config/development.json`)
```json
{
  "environment": "development",
  "debug": true,
  "sourceMap": true,
  "optimization": false,
  "linting": { "fix": true },
  "testing": { "coverage": { "threshold": 70 } }
}
```

### Production Config (`config/production.json`)
```json
{
  "environment": "production",
  "debug": false,
  "sourceMap": false,
  "optimization": true,
  "linting": { "maxWarnings": 0 },
  "testing": { "coverage": { "threshold": 80 } }
}
```

### Environment Variables (`.env`)
```
# Location: Project root
# Purpose: Local machine configuration
# Use: Loaded by Node.js/npm scripts
# Committed: NO - add to .gitignore

NODE_ENV=development
API_KEY=your-secret-key
DEBUG=false
```

---

## 🔐 Access Control

### File Access Rights
```
Source Code (src/)
├─ Developers: ✓ Read/Write
├─ CI/CD: ✓ Read (for compilation)
└─ Users: ✗ Restricted

Build Output (out/, build/)
├─ Developers: ✓ Read (debugging)
├─ CI/CD: ✓ Write (auto-generate)
└─ Users: ✗ Restricted

Configuration (config/)
├─ Developers: ✓ Read/Write
├─ CI/CD: ✓ Read
└─ Users: ✗ Read-only for inspection

Runtime Data (.atherforge/)
├─ Developers: ✓ Read/Write
├─ CI/CD: ✓ Read
└─ Users: ✓ Read/Write (their data)

Logs (logs/)
├─ Developers: ✓ Read
├─ CI/CD: ✓ Write
└─ Users: ✓ Read (their logs)
```

---

## 🎯 File Lifecycle

### Source File (from creation to deployment)
```
1. CREATE (Developer)
   src/myFeature.ts
   ↓
2. VERSION CONTROL (Git)
   Commit: "feat: Add my feature"
   ↓
3. BUILD (CI/CD)
   Compile to: out/extension.js (dev)
   ↓
4. TEST (Automated)
   Run tests, lint, type-check
   ↓
5. PRODUCTION BUILD (CI/CD)
   Minify to: build/extension.js (prod)
   ↓
6. PACKAGE (Marketplace)
   Include in .vsix package
   ↓
7. DEPLOY (User)
   Install to VS Code
```

### Data File (Analytics)
```
1. CREATE (Runtime)
   .atherforge/prompt-analytics.jsonl
   ↓
2. APPEND (Each AI operation)
   Line 1: {"timestamp": "2026-02-16T10:00:00Z", ...}
   Line 2: {"timestamp": "2026-02-16T10:01:00Z", ...}
   ↓
3. QUERY (Dashboard)
   Read and visualize trends
   ↓
4. ARCHIVE (Admin)
   Move to: logs/archive/2026-02-16/
   ↓
5. DELETE (Retention policy)
   After 90 days
```

---

## 🔧 Maintaining File Organization

### Weekly Maintenance
- Move old logs: `logs/*.log` → `logs/archive/`
- Archive history: `.atherforge/history/` (auto-organized by month)
- Clean build outputs: Delete `out/`, `build/` (regenerate on next build)

### Monthly Maintenance
- Review `.atherforge/` directory size
- Rotate analytics: Archive `prompt-analytics.jsonl` if > 10MB
- Update `.env` with new API keys/settings

### Quarterly Cleanup
- Archive 3-month-old logs
- Remove unused scripts
- Update configuration templates

---

## 💡 Best Practices

### ✅ DO
- Use meaningful file names that describe content
- Keep related files in same directory
- Use version control for all source code
- Organize logs by date
- Document all configuration files

### ❌ DON'T
- Mix build outputs with source code
- Commit environment variables
- Use generic names like "temp", "backup", "old"
- Store credentials in code or comments
- Keep large log files (archive regularly)

---

## 📊 File Size Guidelines

| Category | Max Size | Action |
|----------|----------|--------|
| Single source file | 1000 LOC | Refactor if larger |
| Package.json | 10KB | Keep clean |
| Config files | 100KB | Reasonable limit |
| Log files | 100MB | Archive when full |
| Analytics JSONL | 50MB | Archive/rotate |
| Build outputs | 500MB | Clean regularly |

---

## 🔄 Migration Guide

### Moving to New Directory
```bash
# Example: Moving from old to new structure
# Old: randomly placed scripts
# New: organized in scripts/ directory

### Step 1: Create new directory
mkdir scripts

### Step 2: Move files
mv build.sh scripts/compile.ps1
mv run-dev.sh scripts/develop.ps1

### Step 3: Update references
# Update package.json scripts section

### Step 4: Commit
git add scripts/
git commit -m "refactor: organize build scripts into scripts/ directory"
```

---

## 📞 File Organization Resources

- **Naming conventions:** See section "File Naming Conventions" above
- **Directory structure:** See section "Directory Structure" above
- **Build automation:** See `scripts/README.md`
- **Configuration:** See files in `config/` directory
- **Documentation:** See files in `docs/` directory

---

## Status

✅ **File Management System Complete**
- ✅ Proper directory structure created
- ✅ File naming conventions defined
- ✅ Configuration files organized
- ✅ Build scripts in place
- ✅ Documentation comprehensive
- ✅ PowerShell execution policy bypass working

All files are properly organized and ready for development and production use!
