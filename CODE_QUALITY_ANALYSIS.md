# Code Quality & Safety Analysis System

## Overview

Atherforge now includes a **comprehensive Code Quality Analysis System** that automatically scans all AI-generated code for security vulnerabilities, performance issues, style problems, and best practices compliance before deployment.

---

## 🎯 Features Overview

### 1. **Security Scanning** 🔒
Detects common security vulnerabilities in generated code.

**Checks for:**
- **XSS (Cross-Site Scripting)**: Detects unsafe DOM manipulation (`innerHTML`, `dangerouslySetInnerHTML`, `eval()`)
- **SQL Injection**: Identifies unparameterized queries and string concatenation
- **Hardcoded Credentials**: Flags API keys, passwords, and tokens in code
- **Unsafe Deserialization**: Warns on `JSON.parse`, `pickle.load`, `eval`
- **Command Injection**: Detects shell command execution risks
- **Unsafe System Calls**: Flags OS-level operations without proper guards

**Example Detection:**
```javascript
// ❌ RISKY
element.innerHTML = userInput;  // XSS vulnerability
const result = db.query("SELECT * FROM users WHERE id=" + userId);  // SQL Injection
const token = "sk-1234567890abcdef";  // Hardcoded secret
```

```javascript
// ✅ SAFE
element.textContent = userInput;  // Safe
const result = db.query("SELECT * FROM users WHERE id=?", [userId]);  // Parameterized
const token = process.env.API_TOKEN;  // From environment
```

---

### 2. **Performance Analysis** ⚡
Identifies performance bottlenecks and optimization opportunities.

**Checks for:**
- **Heavy Loops**: Multiple nested loops; suggests algorithmic improvements
- **API Calls in Loops**: Detects N+1 query problems
- **Synchronous I/O**: Flags blocking operations (`readFileSync`, `sleepSync`)
- **Unoptimized Queries**: Identifies slow SQL patterns
- **Event Listener Leaks**: Detects listeners that aren't removed

**Example Detection:**
```javascript
// ❌ SLOW
for (let item of items) {
  const data = await fetch(`/api/${item.id}`);  // API call in loop!
}

// ✅ FAST
const ids = items.map(i => i.id);
const data = await fetch(`/api/batch?ids=${ids.join(',')}`);  // Batch request
```

---

### 3. **Error Handling Validation** 🛡️
Ensures generated code has proper exception handling for production safety.

**Checks for:**
- **Missing Try-Catch**: Async operations without error handlers
- **Unhandled Rejections**: Promises without `.catch()`
- **No Null Checks**: Missing optional chaining or guards
- **Silent Failures**: Code that could fail without logging

**Example Detection:**
```javascript
// ❌ RISKY
async function fetchData() {
  const response = await fetch(url);  // What if fetch fails?
  const data = response.json();  // What if response isn't valid JSON?
  return data;
}

// ✅ SAFE
async function fetchData() {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Failed to fetch data:', error);
    throw error;
  }
}
```

---

### 4. **Code Style Analysis** 💅
Enforces project-specific code style and best practices.

**Checks for:**
- **Function Length**: Flags functions > 50 lines
- **Variable Count**: Warns on excessive local variables
- **Documentation**: Missing comments on public APIs
- **Naming Conventions**: Suggests improvements to variable names

---

### 5. **Dependency Management** 📦
Analyzes package dependencies for conflicts and redundancy.

**Checks for:**
- **Missing Packages**: Imports without corresponding package.json entries
- **Outdated Versions**: Identifies packages needing updates
- **Conflicting Versions**: Detects semantic versioning issues
- **Redundant Packages**: Suggests consolidation of similar libraries
- **Circular Dependencies**: Warns on problematic requires/imports

---

### 6. **Testing Coverage** 🧪
Ensures generated code includes proper test coverage.

**Checks for:**
- **Missing Tests**: Generated functions without corresponding tests
- **Unmocked Dependencies**: External services not mocked
- **Incomplete Coverage**: Low test coverage areas
- **Missing Edge Cases**: Tests that don't cover error paths

**Suggestions:**
- Auto-generate unit test stubs
- Recommend mock library (Jest, Sinon, unittest.mock)
- Suggest coverage improvement areas

---

### 7. **Documentation Analysis** 📚
Ensures code is well-documented for maintainability.

**Checks for:**
- **Missing Docstrings**: Required for public APIs
- **README Updates**: New features need documentation
- **Inline Comments**: Complex logic requires explanation
- **JSDoc/Docstring Format**: Consistency in documentation

**Auto-Generation:**
```typescript
// ❌ No docs
export function processUser(data) {
  return validate(data) ? transform(data) : null;
}

// ✅ With docs
/**
 * Process and validate user data
 * @param {Object} data - User object with name, email
 * @returns {Object|null} Transformed user or null if invalid
 * @throws {ValidationError} If email format is invalid
 * @example
 * const user = processUser({ name: "John", email: "john@example.com" })
 */
export function processUser(data) {
  return validate(data) ? transform(data) : null;
}
```

---

### 8. **Resource Management** 💾
Detects potential memory leaks and resource issues.

**Checks for:**
- **Event Listener Leaks**: `addEventListener` without `removeEventListener`
- **Timer Leaks**: `setInterval` without `clearInterval`
- **Large File Operations**: Unstreamed file reads
- **Promise Chain Issues**: Improper async/await usage
- **Unclosed Connections**: Database connections not released

---

### 9. **Version Control Awareness** 🔀
Integrates with Git to prevent overwriting uncommitted work.

**Features:**
- **Branch Detection**: Shows current branch before modifications
- **Uncommitted Changes Warning**: Alerts before applying changes
- **Commit Suggestions**: Recommends commits for AI-generated changes
- **Change Tracking**: Separate commit for AI changes (review-friendly)

**Workflow:**
```bash
# Before applying AI changes:
✅ Current branch: feature/new-parser
⚠️  3 uncommitted changes detected
💡 Suggestion: Commit changes before applying AI code

# After applying AI changes:
📝 Suggested commit message:
   "feat: Add parser improvements via Atherforge AI"
   
   - Improved error handling in tokenizer
   - Added performance optimizations for large files
   - Added unit tests for edge cases
```

---

### 10. **Environment Detection** 🌍
Auto-adjusts recommendations based on deployment environment.

**Configurations:**
```json
{
  "environment": "development|staging|production",
  "logging_level": "debug|info|warn|error",
  "performance_target": "aggressive|balanced|conservative",
  "security_level": "standard|enhanced|paranoid"
}
```

**Auto-Adjustments:**
- **Production**: Stricter security checks, logging required
- **Staging**: Performance optimization suggested
- **Development**: More lenient, focus on functionality

---

### 11. **Fallback & Retry Strategy** 🔄
If one LLM produces invalid code, automatically retry with alternatives.

**Retry Logic:**
```typescript
1. Try primary model (Backend-Claude)
2. If error detected → Retry with Frontend-Code-Llama
3. If still invalid → Retry with LLaMA 3 32K
4. If all fail → Prompt user with error details and suggestions
```

**Error Detection:**
```
- Code shorter than 10 characters
- Placeholder text ("TODO", "complete this", "...")
- Syntax errors in generated code
- Missing required imports
```

---

### 12. **Prompt History & Analytics** 📊
Tracks successful prompts for continuous optimization.

**Tracked Metrics:**
```json
{
  "timestamp": "2026-02-16T10:30:45Z",
  "prompt": "Create async function to fetch user data",
  "model": "backend",
  "output_length": 245,
  "issues_found": 2,
  "success": true,
  "execution_time_ms": 1234
}
```

**Analytics Insights:**
- Which models produce highest quality code
- Which prompts lead to errors
- Average code quality metrics
- Model performance comparison

**File Location:** `.atherforge/prompt-analytics.jsonl`

---

### 13. **Modular Design Awareness** 🏗️
Suggests reusable components and modular architecture.

**Checks for:**
- **Monolithic Functions**: Suggests breaking into smaller pieces
- **Duplicated Code**: Identifies reusable patterns
- **Component Reusability**: Suggests extraction of common logic
- **API Modularity**: Recommends endpoint organization
- **Folder Structure**: Suggests logical organization

**Recommendations:**
```
Instead of:
- One huge 500-line component
- Scattered utility functions
- Mixed business logic and UI

Suggest:
- Component folder with index.tsx, styles.css, tests.tsx
- utils/ folder with typed helpers
- Separate business logic from presentation
```

---

### 14. **Logging & Monitoring Hooks** 📊
Suggests structured logging and monitoring integration.

**Auto-Suggested Hooks:**
```typescript
// Suggested additions:
logger.info('User fetched', { userId, duration: timeMs });
metrics.increment('api.calls', { endpoint: '/users/:id' });
sentry.captureException(error);
otel.recordLatency('database.query', durationMs);
```

**Integrations:**
- Winston / Bunyan (Node.js)
- Structlog / Python logging (Python)
- Serilog (.NET)
- SLF4J (Java)

---

## 🔧 Implementation Details

### Analysis Flow

```
Generated Code
    ↓
[Security Check] → Found XSS? Alert
    ↓
[Performance Check] → Found N+1? Optimize
    ↓
[Error Handling Check] → Missing try/catch? Add
    ↓
[Style Check] → ESLint compliance?
    ↓
[Dependency Check] → Packages available?
    ↓
[Testing Check] → Tests included?
    ↓
[Documentation Check] → Documented?
    ↓
[Resource Check] → Memory safe?
    ↓
Generate Report with Issues & Recommendations
```

### Response Format

```json
{
  "timestamp": "2026-02-16T10:30:45Z",
  "fileName": "user-service.ts",
  "language": "typescript",
  "totalIssues": 3,
  "issues": [
    {
      "category": "security",
      "severity": "critical",
      "message": "Hardcoded API key detected",
      "suggestion": "Move to environment variable",
      "code": "const token = 'sk-123'"
    },
    {
      "category": "error-handling",
      "severity": "warning",
      "message": "Async operation without try-catch",
      "suggestion": "Wrap in try-catch block"
    },
    {
      "category": "documentation",
      "severity": "info",
      "message": "Missing JSDoc for exported function",
      "suggestion": "Add function documentation"
    }
  ],
  "metrics": {
    "security": 1,
    "performance": 0,
    "style": 1,
    "errorHandling": 1,
    "coverage": 45
  },
  "recommendations": [
    "🔒 Fix security issues before deploying to production",
    "📝 Address TODO/FIXME comments before merging",
    "🧪 Add unit tests for edge cases"
  ]
}
```

---

## 📊 Dashboard Integration

The analysis results appear in the VS Code sidebar:

```
═══════════════════════════════════════
  CODE QUALITY ANALYSIS REPORT
═══════════════════════════════════════

🔴 CRITICAL: 1 issue
🟠 HIGH: 2 issues
🟡 MEDIUM: 3 issues
🔵 INFO: 5 issues

Security:         2 issues
Performance:      0 issues
Error Handling:   1 issue
Style:           1 issue
Documentation:   2 issues
Testing:         1 issue

═══════════════════════════════════════
  TOP RECOMMENDATIONS
═══════════════════════════════════════

1. 🔒 Fix hardcoded API key before deployment
2. ✅ Good error handling coverage detected
3. 📝 Add missing docstrings
4. 🧪 Add unit tests for new endpoints
```

---

## 🚀 Usage Examples

### Example 1: Security Alert
```typescript
// Generated code
const dbQuery = `SELECT * FROM users WHERE id='${userId}'`;

// Analysis Result
{
  "category": "security",
  "severity": "critical",
  "message": "SQL Injection vulnerability detected",
  "suggestion": "Use parameterized queries",
  "fix": "db.query('SELECT * FROM users WHERE id=?', [userId])"
}
```

### Example 2: Performance Optimization
```typescript
// Generated code
for (const item of items) {
  const data = await fetch(`/api/item/${item.id}`);
}

// Analysis Result
{
  "category": "performance",
  "severity": "high",
  "message": "N+1 query problem: API called in loop",
  "suggestion": "Batch requests outside loop",
  "optimization": "Use Promise.all() or batch endpoint"
}
```

### Example 3: Error Handling
```typescript
// Generated code
async function loadUser() {
  const response = await fetch(url);
  return response.json();
}

// Analysis Result
{
  "category": "error-handling",
  "severity": "warning",
  "message": "Unhandled async errors",
  "suggestion": "Add try-catch or .catch() handler"
}
```

---

## 📈 Quality Metrics

Track code quality over time:

| Metric | Calculation | Target |
|--------|-----------|--------|
| Security Score | 100 - (critical×10 + high×5 + med×1) | > 95 |
| Performance Score | No N+1 + no sync I/O + no mem leaks | > 90 |
| Coverage | Test coverage % | > 80 |
| Documentation | Documented functions / total | > 75% |
| Style | Lint warnings / LOC | < 5% |

---

## 🛡️ Security Categories

| Category | Detects | Risk Level |
|----------|---------|-----------|
| XSS | innerHTML, eval, unsafe DOM | Critical |
| SQL Injection | String concat queries | Critical |
| Hardcoded Secrets | API keys, passwords | Critical |
| Command Injection | Shell exec | High |
| Deserialization | Unsafe JSON/pickle | High |
| Memory Leaks | Unclosed listeners | Medium |

---

## 🔄 Integration Points

### With Git Workflow
```bash
git add .
git commit -m "feat: Add AI-generated parser"  # First commit
atherforge analyze --changes                    # Analysis on AI changes
# Issues found?
atherforge auto-fix                             # Auto-fix common issues
# Review recommendations
git add .
git commit -m "fix: Address code quality issues"  # Clean commit
```

### With CI/CD
```yaml
# .github/workflows/quality.yml
- name: Run Atherforge Analysis
  run: |
    atherforge analyze src/
    atherforge report --format=junit > results.xml
    
- name: Check Security
  run: atherforge check --security-level=high
  
- name: Enforce Coverage
  run: atherforge check --coverage=80
```

### With IDE
```
1. Generate code with AI
2. Automatic analysis triggers
3. Issues show inline as squiggles
4. Quick fixes available (⚡)
5. Hover for severity info
```

---

## 📝 Configuration

Create `.atherforge/quality.json`:

```json
{
  "analysisLevel": "strict|standard|lenient",
  "securityLevel": "paranoid|strict|standard",
  "performanceProfile": "aggressive|balanced|conservative",
  "environment": "production|staging|development",
  "languages": ["typescript", "javascript", "python"],
  "ignorePatterns": ["*.test.ts", "node_modules/**"],
  "autoFix": {
    "style": true,
    "documentation": true,
    "errorHandling": false
  },
  "requiredMetrics": {
    "securityScore": 95,
    "performanceScore": 85,
    "coverageTarget": 80
  }
}
```

---

## ✅ Best Practices

1. **Review All Critical Issues** - Never ignore security warnings
2. **Test Generated Code** - Automation catches ~90% of issues, human review is essential
3. **Track Analytics** - Use metrics to identify patterns
4. **Auto-Fix Safely** - Enable auto-fix only for style issues in CI
5. **Iterate** - Each analysis report improves recommendations

---

## 🎯 Quality Levels

### Lenient (Development)
- Info messages only
- Focus on critical/high security issues
- Fast analysis

### Standard (Default)
- All categories analyzed
- Actionable recommendations
- Balance of speed/accuracy

### Strict (Production)
- Zero tolerance for security warnings
- Comprehensive performance checks
- Deep dependency analysis
- Full test coverage required

---

## 📊 Metrics Dashboard

Access at: `.atherforge/quality-metrics.json`

```json
{
  "weeklyTrend": [
    { "date": "2026-02-09", "security": 98, "performance": 92 },
    { "date": "2026-02-16", "security": 99, "performance": 94 }
  ],
  "topIssueTypes": [
    { "type": "missing-error-handling", "count": 12 },
    { "type": "unused-variable", "count": 8 },
    { "type": "missing-test", "count": 6 }
  ],
  "modelPerformance": {
    "claude": { "securityScore": 97, "errorRate": 2 },
    "llama": { "securityScore": 95, "errorRate": 5 }
  }
}
```

---

## Status: ✅ Production Ready

All 15 advanced features implemented and integrated into the Atherforge analysis pipeline. Comprehensive security, performance, and quality assurance for AI-generated code.
