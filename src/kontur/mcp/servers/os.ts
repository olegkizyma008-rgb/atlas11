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
                name: "get_screen_size",
                description: "Get current screen resolution",
                inputSchema: { type: "object", properties: {} }
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

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "open_application") {
            const { appName } = args as { appName: string };
            // Activate app and wait for it to gain focus
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

        if (name === "execute_applescript") {
            const { script } = args as { script: string };
            const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
            return { content: [{ type: "text", text: stdout || "Script executed" }] };
        }

        if (name === "keyboard_type") {
            const { text } = args as { text: string };
            // Use keystroke for regular text, escaping properly
            const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            await execAsync(`osascript -e 'tell application "System Events" to keystroke "${escaped}"'`);
            return { content: [{ type: "text", text: `Typed: ${text}` }] };
        }

        if (name === "keyboard_press") {
            const { key, modifiers } = args as { key: string, modifiers?: string[] };
            const modStr = modifiers && modifiers.length ? ` using {${modifiers.join(", ")}}` : "";

            // Map common key names to key codes
            const keyCodes: Record<string, number> = {
                'return': 36, 'enter': 36, 'tab': 48, 'space': 49, 'delete': 51,
                'escape': 53, 'left': 123, 'right': 124, 'down': 125, 'up': 126,
                'f1': 122, 'f2': 120, 'f3': 99, 'f4': 118, 'f5': 96
            };

            const keyLower = key.toLowerCase();
            if (keyCodes[keyLower] !== undefined) {
                // Use key code for special keys
                await execAsync(`osascript -e 'tell application "System Events" to key code ${keyCodes[keyLower]}${modStr}'`);
            } else {
                // Use keystroke for regular characters
                await execAsync(`osascript -e 'tell application "System Events" to keystroke "${key}"${modStr}'`);
            }
            return { content: [{ type: "text", text: `Pressed: ${key}${modStr}` }] };
        }

        if (name === "mouse_click") {
            const { x, y } = args as { x: number, y: number };
            // Try simple python implementation if Quartz is available (often is on macOS system python)
            // Fallback to cliclick if installed, or error.
            try {
                // Check for python3
                await execAsync(`python3 -c "${clickScript(x, y)}"`);
                return { content: [{ type: "text", text: `Clicked at ${x},${y}` }] };
            } catch (e) {
                return { content: [{ type: "text", text: `Mouse click failed (Quartz not found). Install 'pyobjc-framework-Quartz' or 'cliclick'. Error: ${e}` }] };
            }
        }

        if (name === "get_screen_size") {
            const { stdout } = await execAsync(`system_profiler SPDisplaysDataType | grep Resolution`);
            return { content: [{ type: "text", text: stdout.trim() }] };
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
