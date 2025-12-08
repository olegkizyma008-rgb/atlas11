import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * MCP Server for OS Automation (macOS)
 * Exposes system capabilities as standard MCP tools
 */
const server = new Server(
    {
        name: "atlas-os-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "open_application",
                description: "Opens an application on macOS and activates it",
                inputSchema: {
                    type: "object",
                    properties: {
                        appName: { type: "string" },
                    },
                    required: ["appName"],
                },
            },
            {
                name: "execute_command",
                description: "Executes a shell command",
                inputSchema: {
                    type: "object",
                    properties: {
                        command: { type: "string" },
                    },
                    required: ["command"],
                },
            },
            {
                name: "execute_applescript",
                description: "Execute raw AppleScript for complex UI automation",
                inputSchema: {
                    type: "object",
                    properties: {
                        script: { type: "string" },
                    },
                    required: ["script"],
                },
            },
            {
                name: "keyboard_type",
                description: "Simulate typing text (as if user typed it)",
                inputSchema: {
                    type: "object",
                    properties: {
                        text: { type: "string" },
                        delay: { type: "number", description: "Delay between keystrokes in seconds (default 0.01)" }
                    },
                    required: ["text"]
                }
            },
            {
                name: "keyboard_press",
                description: "Press a specific key combination",
                inputSchema: {
                    type: "object",
                    properties: {
                        key: { type: "string", description: "Key code or character (e.g. 'return', 'space', 'a')" },
                        modifiers: {
                            type: "array",
                            items: { type: "string" },
                            description: "Modifiers: 'command down', 'shift down', 'option down', 'control down'"
                        }
                    },
                    required: ["key"]
                }
            },
            {
                name: "mouse_click",
                description: "Click mouse at specific coordinates",
                inputSchema: {
                    type: "object",
                    properties: {
                        x: { type: "number" },
                        y: { type: "number" },
                        double: { type: "boolean" }
                    },
                    required: ["x", "y"]
                }
            },
            {
                name: "ui_tree",
                description: "Get accessibility tree of an application",
                inputSchema: {
                    type: "object",
                    properties: {
                        appName: { type: "string" },
                        pid: { type: "number" }
                    }
                }
            },
            {
                name: "ui_find",
                description: "Find UI element by role or title",
                inputSchema: {
                    type: "object",
                    properties: {
                        appName: { type: "string" },
                        pid: { type: "number" },
                        role: { type: "string" },
                        title: { type: "string" }
                    }
                }
            },
            {
                name: "ui_action",
                description: "Perform accessibility action on UI element",
                inputSchema: {
                    type: "object",
                    properties: {
                        appName: { type: "string" },
                        pid: { type: "number" },
                        role: { type: "string" },
                        title: { type: "string" },
                        action: { type: "string", description: "AXPress, AXShowMenu, etc." }
                    },
                    required: ["action"]
                }
            },
            {
                name: "get_screen_size",
                description: "Get current screen resolution",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "get_screenshot",
                description: "Capture screenshot of the main screen",
                inputSchema: {
                    type: "object",
                    properties: {
                        action: { type: "string", description: "screen" }, // Reserved for future 'window'
                        pid: { type: "number" }
                    }
                }
            },
            {
                name: "dev_grep",
                description: "Search text in files (grep)",
                inputSchema: {
                    type: "object",
                    properties: {
                        pattern: { type: "string" },
                        path: { type: "string" },
                        recursive: { type: "boolean" }
                    },
                    required: ["pattern", "path"]
                }
            },
            {
                name: "dev_find",
                description: "Find files by name (find)",
                inputSchema: {
                    type: "object",
                    properties: {
                        pattern: { type: "string" },
                        path: { type: "string" }
                    },
                    required: ["pattern", "path"]
                }
            },
            {
                name: "git_ops",
                description: "Perform git operations",
                inputSchema: {
                    type: "object",
                    properties: {
                        op: { type: "string", description: "status, diff, log, add, commit, push, pull, checkout, branch, init" },
                        args: { type: "array", items: { type: "string" } }
                    },
                    required: ["op"]
                }
            },
            {
                name: "project_scaffold",
                description: "Scaffold a new project",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectName: { type: "string" },
                        type: { type: "string", description: "react, vite, node, python" },
                        path: { type: "string", description: "Parent directory path" }
                    },
                    required: ["projectName", "type", "path"]
                }
            }
        ],
    };
});

// Helper for python mouse click (native macOS without external deps is hard, using embedded python script)
const clickScript = (x: number, y: number) => `
import Quartz.CoreGraphics as CG
import sys
e = CG.CGEventCreateMouseEvent(None, CG.kCGEventLeftMouseDown, (${x}, ${y}), 0)
CG.CGEventPost(CG.kCGHIDEventTap, e)
e = CG.CGEventCreateMouseEvent(None, CG.kCGEventLeftMouseUp, (${x}, ${y}), 0)
CG.CGEventPost(CG.kCGHIDEventTap, e)
`;

// Helper for Native Bridge
const HELPER_PATH = `${process.cwd()}/bin/atlas-ui-helper`;

async function runHelper(args: string[]): Promise<any> {
    try {
        const { stdout } = await execAsync(`"${HELPER_PATH}" ${args.join(' ')}`);
        try {
            return JSON.parse(stdout);
        } catch {
            return stdout.trim();
        }
    } catch (e: any) {
        throw new Error(`Helper failed: ${e.message}`);
    }
}

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        // ... (Existing tools) ...
        if (name === "open_application") {
            const { appName } = args as { appName: string };
            await execAsync(`osascript -e 'tell application "${appName}" to activate' && sleep 0.5`);
            return { content: [{ type: "text", text: `Active: ${appName}` }] };
        }

        if (name === "execute_command") {
            const { command } = args as { command: string };
            const { stdout, stderr } = await execAsync(command);
            return {
                content: [
                    { type: "text", text: stdout || "Done" },
                    ...(stderr ? [{ type: "text", text: `STDERR: ${stderr}` }] : []),
                ],
            };
        }

        // ... (Other existing tools preserved) ...

        // --- NATIVE ACCESSIBILITY TOOLS ---

        if (name === "ui_tree") {
            const { appName, pid } = args as { appName?: string, pid?: number };
            let targetPid = pid;

            if (!targetPid && appName) {
                // Find PID by name
                const { stdout } = await execAsync(`pgrep -x "${appName}" || pgrep -f "${appName}" | head -n 1`);
                targetPid = parseInt(stdout.trim());
            }

            if (!targetPid) throw new Error("Target app not found (provide appName or pid)");

            const params = ["dump-tree", targetPid.toString()];
            const result = await runHelper(params);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        if (name === "ui_find") {
            const { appName, pid, role, title } = args as { appName?: string, pid?: number, role?: string, title?: string };
            let targetPid = pid;

            if (!targetPid && appName) {
                const { stdout } = await execAsync(`pgrep -x "${appName}" || pgrep -f "${appName}" | head -n 1`);
                targetPid = parseInt(stdout.trim());
            }

            if (!targetPid) throw new Error("Target app not found");

            // Helper expects: find-action <pid> <role> <title> <action>
            // We use "_" for empty, and no action for just finding
            const r = role || "_";
            const t = title || "_";

            // We'll abuse find-action with no action to just verify existence if helper supports it,
            // BUT current helper logic for find-action requires an action to do something useful or prints info.
            // Let's use it to "highlight" or just print info.

            const result = await runHelper(["find-action", targetPid.toString(), r, t, "_"]);
            return { content: [{ type: "text", text: result.toString() }] };
        }

        if (name === "ui_action") {
            const { appName, pid, role, title, action } = args as { appName?: string, pid?: number, role?: string, title?: string, action: string };
            let targetPid = pid;

            if (!targetPid && appName) {
                const { stdout } = await execAsync(`pgrep -x "${appName}" || pgrep -f "${appName}" | head -n 1`);
                targetPid = parseInt(stdout.trim());
            }

            if (!targetPid) throw new Error("Target app not found");

            const r = role || "_";
            const t = title || "_";
            const a = action;

            const result = await runHelper(["find-action", targetPid.toString(), r, t, a]);
            return { content: [{ type: "text", text: result.toString() }] };
        }

        // ... (Rest of existing tools: keyboard, mouse, etc.) ...

        if (name === "execute_applescript") {
            const { script } = args as { script: string };
            const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
            return { content: [{ type: "text", text: stdout || "Script executed" }] };
        }

        if (name === "keyboard_type") {
            const { text } = args as { text: string };
            const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            await execAsync(`osascript -e 'tell application "System Events" to keystroke "${escaped}"'`);
            return { content: [{ type: "text", text: `Typed: ${text}` }] };
        }

        if (name === "keyboard_press") {
            const { key, modifiers } = args as { key: string, modifiers?: string[] };
            const modStr = modifiers && modifiers.length ? ` using {${modifiers.join(", ")}}` : "";
            const keyCodes: Record<string, number> = {
                'return': 36, 'enter': 36, 'tab': 48, 'space': 49, 'delete': 51,
                'escape': 53, 'left': 123, 'right': 124, 'down': 125, 'up': 126,
                'f1': 122, 'f2': 120, 'f3': 99, 'f4': 118, 'f5': 96
            };
            const keyLower = key.toLowerCase();
            if (keyCodes[keyLower] !== undefined) {
                await execAsync(`osascript -e 'tell application "System Events" to key code ${keyCodes[keyLower]}${modStr}'`);
            } else {
                await execAsync(`osascript -e 'tell application "System Events" to keystroke "${key}"${modStr}'`);
            }
            return { content: [{ type: "text", text: `Pressed: ${key}${modStr}` }] };
        }

        if (name === "mouse_click") {
            const { x, y } = args as { x: number, y: number };
            try {
                await execAsync(`python3 -c "${clickScript(x, y)}"`);
                return { content: [{ type: "text", text: `Clicked at ${x},${y}` }] };
            } catch (e) {
                return { content: [{ type: "text", text: `Mouse click failed: ${e}` }] };
            }
        }

        if (name === "get_screen_size") {
            const { stdout } = await execAsync(`system_profiler SPDisplaysDataType | grep Resolution`);
            return { content: [{ type: "text", text: stdout.trim() }] };
        }

        if (name === "get_screenshot") {
            const { action, pid } = args as { action?: string, pid?: number };
            const tmpPath = `/tmp/atlas_screenshot_${Date.now()}.jpg`;

            try {
                let cmd = `screencapture -x -t jpg "${tmpPath}"`; // Default: Main screen silently

                if (action === "window" && pid) {
                    // Future window capture logic
                }

                await execAsync(cmd);

                // Read and cleanup
                const fs = await import('fs/promises');
                const buffer = await fs.readFile(tmpPath);
                await fs.unlink(tmpPath);

                return {
                    content: [
                        { type: "text", text: "Screenshot captured" },
                        { type: "image", data: buffer.toString('base64'), mimeType: "image/jpeg" }
                    ]
                };
            } catch (e: any) {
                return { content: [{ type: "text", text: `Screenshot failed: ${e.message}` }], isError: true };
            }
        }

        // --- DEVELOPER TOOLS ---

        if (name === "dev_grep") {
            const { pattern, path, recursive } = args as { pattern: string, path: string, recursive?: boolean };
            try {
                const flags = recursive ? "-r" : "";
                // Safe grep: limit output to 200 lines to avoid token explosion
                const cmd = `grep ${flags} -n "${pattern.replace(/"/g, '\\"')}" "${path}" | head -n 200`;
                const { stdout } = await execAsync(cmd);
                return { content: [{ type: "text", text: stdout || "No matches found." }] };
            } catch (e: any) {
                // grep returns exit code 1 if no matches, which execAsync throws as error
                if (e.code === 1) return { content: [{ type: "text", text: "No matches found." }] };
                return { content: [{ type: "text", text: `Grep failed: ${e.message}` }], isError: true };
            }
        }

        if (name === "dev_find") {
            const { path, pattern } = args as { path: string, pattern: string };
            try {
                // Find with type f (files), name pattern, max depth 5 to be safe
                const cmd = `find "${path}" -maxdepth 10 -name "${pattern}" -not -path '*/.*' | head -n 100`;
                const { stdout } = await execAsync(cmd);
                return { content: [{ type: "text", text: stdout || "No files found." }] };
            } catch (e: any) {
                return { content: [{ type: "text", text: `Find failed: ${e.message}` }], isError: true };
            }
        }

        if (name === "git_ops") {
            const { op, args: gitArgs } = args as { op: string, args?: string[] };
            // White-listed operations for safety
            const allowedOps = ['status', 'diff', 'log', 'add', 'commit', 'push', 'pull', 'checkout', 'branch', 'init'];
            if (!allowedOps.includes(op)) {
                throw new Error(`Git operation '${op}' not allowed. Use: ${allowedOps.join(', ')}`);
            }

            try {
                const safeArgs = (gitArgs || []).map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ');
                const cmd = `git ${op} ${safeArgs}`;
                const { stdout, stderr } = await execAsync(cmd);
                return {
                    content: [
                        { type: "text", text: stdout || "Git operation completed" },
                        ...(stderr ? [{ type: "text", text: `STDERR: ${stderr}` }] : [])
                    ]
                };
            } catch (e: any) {
                return { content: [{ type: "text", text: `Git failed: ${e.message}` }], isError: true };
            }
        }

        if (name === "project_scaffold") {
            const { projectName, type, path } = args as { projectName: string, type: string, path: string };
            const fullPath = `${path}/${projectName}`;

            try {
                let cmd = "";
                if (type === "react" || type === "vite") {
                    // Non-interactive create-vite
                    cmd = `npm create vite@latest "${fullPath}" -- --template react-ts`;
                } else if (type === "node") {
                    cmd = `mkdir -p "${fullPath}" && cd "${fullPath}" && npm init -y && npm install typescript ts-node @types/node --save-dev && npx tsc --init`;
                } else if (type === "python") {
                    cmd = `mkdir -p "${fullPath}" && cd "${fullPath}" && python3 -m venv venv && touch main.py requirements.txt`;
                } else {
                    return { content: [{ type: "text", text: `Unknown project type: ${type}. Supported: react, vite, node, python` }], isError: true };
                }

                await execAsync(cmd);
                return { content: [{ type: "text", text: `✅ Project '${projectName}' scanned at ${fullPath}` }] };
            } catch (e: any) {
                return { content: [{ type: "text", text: `Scaffold failed: ${e.message}` }], isError: true };
            }
        }

        throw new Error(`Unknown tool: ${name}`);
    } catch (error: any) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});

// Start Server
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("OS MCP Server running on stdio");
}

run().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
