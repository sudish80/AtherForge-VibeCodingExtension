- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements

- [x] Scaffold the Project

- [x] Customize the Project

- [x] Install Required Extensions

- [x] Compile the Project

- [x] Create and Run Task

- [ ] Launch the Project

- [x] Ensure Documentation is Complete

- [x] Restrict File Operations to Project Only

- [x] Add Command Injection Prevention

- [x] Add Code Quality & Safety Analysis

- [x] Add GitHub Push Workflow Integration

## Security Features
- **Workspace-Only File Access**: All read/write operations restricted to project directory
- **Path Traversal Protection**: Prevents `..` and absolute paths
- **Validation on Every Operation**: Path validation before all file I/O
- **Error Handling**: Clear errors when attempting to access files outside project
- **Command Injection Prevention**: Whitelist-based shell command validation for pipeline nodes
- **Dangerous Character Blocking**: Prevents `;|&`$()` metacharacters in commands
- **Command Timeout Protection**: Lint (30s), Test (60s) limits
- **Security Logging**: All rejected operations logged to CSV with sanitized details

## File Operation Security
- `readFile()`: Only reads from workspace directory
- `writeFile()`: Only writes to workspace directory  
- `listWorkspace()`: Only lists project files (excludes node_modules, dist, .git, out)

## Command Security
- `lint` nodes: Only execute whitelisted command patterns
- `test` nodes: Only execute whitelisted command patterns
- Blocked: Command separators (`;`, `|`, `&&`, `||`), redirections, command substitution
- Allowed: npm, yarn, pnpm, make, npx, docker commands with standard flags

## Code Quality & Safety Analysis
- **Security Scanning**: Detects XSS, SQL injection, hardcoded secrets, unsafe calls
- **Performance Analysis**: Identifies N+1 queries, heavy loops, memory leaks
- **Error Handling**: Ensures try-catch, validation, logging coverage
- **Code Style**: Enforces ESLint, Prettier, PEP8 compliance
- **Testing Integration**: Detects missing tests, suggests coverage improvements
- **Dependency Management**: Checks for conflicts, missing packages, updates
- **Documentation**: Auto-generates docstrings and API documentation
- **Version Control**: Git branch detection, uncommitted change awareness
- **Environment Detection**: Auto-adjusts for dev/staging/production
- **Resource Management**: Detects memory leaks, file I/O issues
- **Fallback & Retry**: Auto-retries with alternative LLMs on failures
- **Prompt Analytics**: Tracks successful prompts for optimization
- **Collaboration Safety**: Tracks AI changes separately for review
- **Logging Hooks**: Suggests structured logging integration
- **Modular Design**: Recommends reusable components

## GitHub Push Workflow Integration
- **Branch Naming Convention**: Uses `ai/<timestamp>` or `ai/feature-name` format
- **Conflict Handling**: Auto-fetches and rebases before push, notifies user of conflicts
- **Commit Segmentation**: Splits large AI-generated changes into multiple focused commits
- **Pre-Push Hooks**: Runs security scanner, test coverage check, code formatting validation
- **Audit Logging**: Records all push operations to `.atherforge/push-audit.jsonl` for traceability

## GitHub Push Features
- `generateBranchName(featureName?)`: Creates AI-safe branch names with timestamp/feature name
- `handleGitConflicts()`: Detects merge conflicts, attempts rebase, notifies user
- `segmentCommits(changes, maxSize)`: Splits changes into logical, sized commits
- `runPrePushHooks()`: Validates security, tests, formatting before push
- `recordPushAuditLog(context)`: Logs push operations to JSONL audit trail

- Work through each checklist item systematically.
- Keep communication concise and focused.
- Follow development best practices.
