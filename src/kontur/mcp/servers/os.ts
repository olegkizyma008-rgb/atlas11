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
                description: "Opens an application on macOS",
                inputSchema: {
                    type: "object",
                    properties: {
                        appName: {
                            type: "string",
                            description: "Name of the application to open (e.g. 'Calculator', 'Safari')",
                        },
                    },
                    required: ["appName"],
                },
            },
            {
                name: "execute_command",
                description: "Executes a shell command (Use with caution)",
                inputSchema: {
                    type: "object",
                    properties: {
                        command: {
                            type: "string",
                            description: "Shell command to execute",
                        },
                    },
                    required: ["command"],
                },
            },
            {
                name: "speak_text",
                description: "Speak text using system TTS",
                inputSchema: {
                    type: "object",
                    properties: {
                        text: { type: "string" }
                    },
                    required: ["text"]
                }
            },
            {
                name: "execute_applescript",
                description: "Execute raw AppleScript for UI automation (e.g. keystrokes)",
                inputSchema: {
                    type: "object",
                    properties: {
                        script: { type: "string" }
                    },
                    required: ["script"]
                }
            }
        ],
    };
});

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "open_application") {
            const { appName } = args as { appName: string };
            // Use AppleScript to activate for focus
            await execAsync(`osascript -e 'tell application "${appName}" to activate'`);
            return {
                content: [{ type: "text", text: `Opened application (Focus): ${appName}` }],
            };
        }

        if (name === "execute_command") {
            const { command } = args as { command: string };
            const { stdout, stderr } = await execAsync(command);
            return {
                content: [
                    { type: "text", text: stdout || "Command executed successfully" },
                    ...(stderr ? [{ type: "text", text: `STDERR: ${stderr}` }] : []),
                ],
            };
        }

        if (name === "speak_text") {
            const { text } = args as { text: string };
            await execAsync(`say "${text}"`);
            return {
                content: [{ type: "text", text: `Spoke: "${text}"` }]
            }
        }

        if (name === "execute_applescript") {
            const { script } = args as { script: string };
            const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
            return {
                content: [{ type: "text", text: stdout || "Script executed" }]
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
