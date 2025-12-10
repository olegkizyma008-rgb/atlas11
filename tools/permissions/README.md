# macOS Permissions Helper (tools/permissions)

This folder contains a simple accessibility check script used to diagnose macOS Accessibility permission problems.

Files
- `check_accessibility.sh` : a tiny script that runs a simple AppleScript test and prints steps for enabling Accessibility in System Settings.

Why here?
- The main repository already contains runtime permission checks (see `src/kontur/mcp/servers/os.ts`) but having a local CLI helper makes it quick to diagnose on the user's machine.

How to run:

```bash
chmod +x tools/permissions/check_accessibility.sh
./tools/permissions/check_accessibility.sh
```

If the script reports missing permissions, follow the printed steps to add Terminal and your Python binary to System Settings → Privacy & Security → Accessibility.
