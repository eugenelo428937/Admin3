#!/bin/bash
#
# Pre-commit test gate for Claude Code hooks.
#
# This script is called by a Claude Code PreToolUse hook on Bash commands.
# It checks if the command is a git commit, and if so, runs the Django
# test suite to ensure all tests pass before allowing the commit.
#
# Environment variables used by Claude Code hooks:
#   CLAUDE_TOOL_INPUT - JSON string with the tool's input parameters
#
# Exit codes:
#   0 - Allow the operation (not a commit, or tests pass)
#   1 - Block the operation (tests failed)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend/django_Admin3"

# Check if this is a git commit command
# CLAUDE_TOOL_INPUT contains the Bash command being executed
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"

# If no tool input or not a commit command, allow it
if [ -z "$TOOL_INPUT" ]; then
    exit 0
fi

# Check if the command contains "git commit"
if ! echo "$TOOL_INPUT" | grep -q "git commit"; then
    exit 0
fi

echo "=== Pre-commit Test Gate ==="
echo "Detected git commit. Running Django test suite..."
echo ""

# Find Python executable (try venv first, then system)
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

# Run the test suite
cd "$BACKEND_DIR"
TEST_OUTPUT=$("$PYTHON" manage.py test --settings=django_Admin3.settings.development --keepdb --verbosity=1 2>&1) || TEST_EXIT=$?
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

# Extract test count from output
TEST_COUNT=$(echo "$TEST_OUTPUT" | grep -oP "Ran \K\d+" || echo "?")
echo "PASSED: All $TEST_COUNT tests passed."
echo "=== End Pre-commit Test Gate ==="
exit 0
