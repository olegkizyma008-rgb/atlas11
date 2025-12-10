#!/usr/bin/env bash
# Simple macOS Accessibility permission checker.
# This tool attempts to run a minimal AppleScript that requires Accessibility
# and prints friendly instructions when permission is missing.

set -euo pipefail

TEST_SCRIPT='tell application "System Events" to return name of first process'

echo "Checking Accessibility permissions via osascript..."

if osascript -e "$TEST_SCRIPT" >/dev/null 2>&1; then
  echo "✅ Accessibility permissions appear to be granted."
  exit 0
else
  echo "❌ Accessibility permissions NOT granted."
  cat <<'INSTR'
Please enable Accessibility permissions for Terminal (and Python if you use a dedicated python binary):

1. Open System Settings → Privacy & Security → Accessibility
2. Press the + button and add your Terminal (Terminal, iTerm, etc.)
3. Add the Python binary used by your project (eg. /opt/homebrew/opt/python@3.12/bin/python3.12)
4. Toggle the permission ON, then restart Terminal and retry

Optionally: Reset the Accessibility database (will require granting permissions again):
  tccutil reset Accessibility

If you still see issues, restart your Mac and try again.
INSTR
  exit 1
fi
