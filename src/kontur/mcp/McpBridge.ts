import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ListToolsResult, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * MCP Bridge for KONTUR
 * Allows ATLAS to connect to standard MCP servers (stdio)
 */
export class McpBridge {
    private client: Client;
    private transport: StdioClientTransport;
    private isConnected: boolean = false;

    constructor(
        public serverName: string,
        public serverVersion: string,
        private command: string,
        private args: string[] = []
    ) {
        this.transport = new StdioClientTransport({
            command: this.command,
            args: this.args
        });

        this.client = new Client(
            {
                name: "atlas-client",
                version: "1.0.0",
            },
            {
                capabilities: {},
            }
        );
    }

    async connect() {
        if (this.isConnected) return;
        try {
            console.log(`[MCP] 🔌 Connecting to ${this.serverName}...`);
            await this.client.connect(this.transport);
            this.isConnected = true;
            console.log(`[MCP] ✅ Connected to ${this.serverName}`);
        } catch (e) {
            console.error(`[MCP] ❌ Connection failed for ${this.serverName}:`, e);
            throw e;
        }
    }

    async disconnect() {
        if (!this.isConnected) return;
        await this.client.close();
        this.isConnected = false;
    }

    async listTools(): Promise<any[]> {
        if (!this.isConnected) await this.connect();
        try {
            const result = await this.client.listTools();
            // Map to Gemini Function Declaration format or return raw
            return result.tools;
        } catch (e) {
            console.error(`[MCP] Failed to list tools for ${this.serverName}:`, e);
            return [];
        }
    }

    async callTool(name: string, args: any): Promise<any> {
        if (!this.isConnected) await this.connect();
        try {
            console.log(`[MCP] 🔧 Calling tool ${name} with args:`, JSON.stringify(args));
            const result = await this.client.callTool({
                name,
                arguments: args
            });
            console.log(`[MCP] ✅ Tool ${name} result:`, JSON.stringify(result));
            return result;
        } catch (e) {
            console.error(`[MCP] ❌ Failed to call tool ${name}:`, e);
            throw e;
        }
    }
}
