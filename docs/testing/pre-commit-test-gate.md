# Pre-commit Test Gate

## Problem Statement

Developers (and Claude Code agents) can commit code while the Django test suite is broken. This means defective code enters the git history and potentially CI pipelines, requiring later investigation to identify which commit introduced the failure. The existing TDD guard (`tdd-guard.config.js`) enforces that test files *exist* before implementation, but it does not verify that tests actually *pass* before committing.

## What It Does

The pre-commit test gate is a shell script that integrates with Claude Code's hook system. When a `git commit` command is detected, it:

1. Runs the entire Django test suite
2. If any test fails, **blocks the commit** and shows which tests failed
3. If all tests pass, **allows the commit** to proceed

This provides a last line of defense: no commit can be created while the test suite is broken.

## How It Works

### Hook Chain

```
Claude Code agent runs Bash tool with "git commit ..."
    |
    v
Claude Code PreToolUse hook fires (matcher: "Bash")
    |
    v
.claude/settings.json invokes: bash scripts/pre-commit-test-gate.sh
    |
    v
Script reads CLAUDE_TOOL_INPUT environment variable
    |
    v
If command contains "git commit":
    |
    +-- Run: python manage.py test --settings=django_Admin3.settings.development --keepdb
    |
    +-- Tests pass?  --> exit 0 (allow commit)
    +-- Tests fail?  --> exit 1 (block commit, show failures)
    |
If command does NOT contain "git commit":
    +-- exit 0 (allow, no interference)
```

### Configuration

The hook is registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash scripts/pre-commit-test-gate.sh"
          }
        ]
      }
    ]
  }
}
```

The `PreToolUse` hook fires *before* Claude Code executes any Bash command. The `matcher: "Bash"` means it runs for every Bash tool invocation. The script itself checks whether the command is a `git commit` and exits immediately (code 0) for non-commit commands.

### The Script

[scripts/pre-commit-test-gate.sh](../../scripts/pre-commit-test-gate.sh):

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend/django_Admin3"

# Check if this is a git commit command
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"
if [ -z "$TOOL_INPUT" ] || ! echo "$TOOL_INPUT" | grep -q "git commit"; then
    exit 0  # Not a commit, allow it
fi

echo "=== Pre-commit Test Gate ==="
echo "Detected git commit. Running Django test suite..."

# Find Python (venv first, then system)
PYTHON=""
if [ -f "$BACKEND_DIR/.venv/bin/python" ]; then
    PYTHON="$BACKEND_DIR/.venv/bin/python"
elif [ -f "$BACKEND_DIR/.venv/Scripts/python.exe" ]; then
    PYTHON="$BACKEND_DIR/.venv/Scripts/python.exe"
elif command -v python3 &> /dev/null; then
    PYTHON="python3"
elif command -v python &> /dev/null; then
    PYTHON="python"
else
    echo "WARNING: Python not found. Skipping test gate."
    exit 0
fi

# Run test suite
cd "$BACKEND_DIR"
TEST_OUTPUT=$("$PYTHON" manage.py test \
    --settings=django_Admin3.settings.development \
    --keepdb --verbosity=1 2>&1) || TEST_EXIT=$?
TEST_EXIT=${TEST_EXIT:-0}

if [ "$TEST_EXIT" -ne 0 ]; then
    echo "BLOCKED: Django test suite has failures."
    echo ""
    echo "Failed tests:"
    echo "$TEST_OUTPUT" | grep -E "^(FAIL|ERROR):" || true
    echo ""
    echo "Fix these failures before committing."
    echo "=== End Pre-commit Test Gate ==="
    exit 1
fi

TEST_COUNT=$(echo "$TEST_OUTPUT" | grep -oP "Ran \K\d+" || echo "?")
echo "PASSED: All $TEST_COUNT tests passed."
echo "=== End Pre-commit Test Gate ==="
exit 0
```

### Behavior Summary

| Scenario | Script Action | Exit Code | Effect |
|----------|---------------|-----------|--------|
| Bash command is `git status` | Detects no "git commit", exits immediately | 0 | Command allowed |
| Bash command is `git commit -m "..."` | Runs test suite, all pass | 0 | Commit allowed |
| Bash command is `git commit -m "..."` | Runs test suite, some fail | 1 | Commit blocked |
| Python not found in PATH or venv | Prints warning, skips gate | 0 | Commit allowed (graceful degradation) |
| `CLAUDE_TOOL_INPUT` not set | Exits immediately | 0 | Command allowed |

### Relationship to TDD Guard

The pre-commit test gate complements the TDD guard system:

| System | What It Enforces | When |
|--------|------------------|------|
| `tdd-guard.config.js` | Test files must exist before writing implementation code | Before file writes |
| `pre-commit-test-gate.sh` | Test suite must pass before committing | Before git commit |

Both are configured in `.claude/settings.json` as `PreToolUse` hooks. The TDD guard matches `Write|Edit|MultiEdit|TodoWrite` tools; the test gate matches `Bash` tool.

---

## Maintenance Guide

### Modifying the Test Command

The script runs:
```bash
python manage.py test --settings=django_Admin3.settings.development --keepdb --verbosity=1
```

To change the test settings or flags, edit [scripts/pre-commit-test-gate.sh](../../scripts/pre-commit-test-gate.sh) line 57. The `--keepdb` flag reuses the test database across runs to speed up the gate.

### Adding Frontend Tests to the Gate

Currently only Django tests are enforced. To also enforce frontend tests, add a second test command in the script:

```bash
# After the Django test block, add:
cd "$PROJECT_ROOT/frontend/react-Admin3"
npm test -- --watchAll=false --passWithNoTests 2>&1 || FRONTEND_EXIT=$?
FRONTEND_EXIT=${FRONTEND_EXIT:-0}

if [ "$FRONTEND_EXIT" -ne 0 ]; then
    echo "BLOCKED: Frontend tests have failures."
    exit 1
fi
```

### Disabling the Gate Temporarily

To disable the test gate without removing it:

1. **Comment out the hook** in `.claude/settings.json`:
   ```json
   {
     "hooks": {
       "PreToolUse": [
         // {
         //   "matcher": "Bash",
         //   "hooks": [{ "type": "command", "command": "bash scripts/pre-commit-test-gate.sh" }]
         // }
       ]
     }
   }
   ```

2. Or **make the script exit immediately** by adding `exit 0` at line 2 of the script.

### Python Detection

The script searches for Python in this order:
1. `backend/django_Admin3/.venv/bin/python` (Unix venv)
2. `backend/django_Admin3/.venv/Scripts/python.exe` (Windows venv)
3. `python3` on PATH
4. `python` on PATH
5. If none found: prints a warning and allows the commit

If your virtual environment is in a different location, update the paths in the script (lines 42-53).

### Debugging

If the gate blocks a commit unexpectedly:

1. Run the test suite manually to see the full output:
   ```bash
   cd backend/django_Admin3
   python manage.py test --settings=django_Admin3.settings.development --keepdb --verbosity=2
   ```

2. Check which Python the script finds:
   ```bash
   SCRIPT_DIR="$(cd scripts && pwd)"
   PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
   BACKEND_DIR="$PROJECT_ROOT/backend/django_Admin3"
   ls -la "$BACKEND_DIR/.venv/bin/python" 2>/dev/null || echo "No venv python"
   which python3 || echo "No python3"
   ```

3. The script uses `--keepdb` to reuse the test database. If the database is in a corrupt state, drop it:
   ```bash
   cd backend/django_Admin3
   python manage.py test --settings=django_Admin3.settings.development --verbosity=2
   ```
   (Without `--keepdb`, Django creates a fresh test database.)

### Key Files

| File | Purpose |
|------|---------|
| [scripts/pre-commit-test-gate.sh](../../scripts/pre-commit-test-gate.sh) | The gate script itself |
| [.claude/settings.json](../../.claude/settings.json) | Hook registration (PreToolUse matcher) |
| [scripts/tdd-guard.config.js](../../scripts/tdd-guard.config.js) | TDD enforcement config (complementary system) |
