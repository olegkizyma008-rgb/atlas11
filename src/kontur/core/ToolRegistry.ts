/**
 * Tool Registry - Centralized registry for all available system tools
 * Provides tool awareness to all ATLAS components (Brain, Tetyana, Grisha)
 */

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    target: string; // KONTUR URN (e.g., 'kontur://organ/mcp/os')
    source: string; // Which MCP server provides this tool
}

class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();
    private initialized: boolean = false;

    /**
     * Register a tool in the registry
     */
    registerTool(tool: ToolDefinition): void {
        if (this.tools.has(tool.name)) {
            console.warn(`[TOOL REGISTRY] ⚠️ Tool '${tool.name}' already registered, overwriting`);
        }
        this.tools.set(tool.name, tool);
    }

    /**
     * Register multiple tools from an MCP server
     */
    registerMCPTools(tools: any[], source: string, target: string): void {
        for (const tool of tools) {
            this.registerTool({
                name: tool.name,
                description: tool.description || '',
                inputSchema: tool.inputSchema || {},
                target,
                source
            });
        }
        console.log(`[TOOL REGISTRY] ✅ Registered ${tools.length} tools from ${source}`);
    }

    /**
     * Check if a tool exists
     */
    hasTool(name: string): boolean {
        return this.tools.has(name);
    }

    /**
     * Get tool definition
     */
    getTool(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    /**
     * Get KONTUR URN target for a tool
     */
    getToolTarget(name: string): string | undefined {
        return this.tools.get(name)?.target;
    }

    /**
     * Get all tool names
     */
    getAllToolNames(): string[] {
        return Array.from(this.tools.keys());
    }

    /**
     * Get all tools
     */
    getAllTools(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get tool count
     */
    getToolCount(): number {
        return this.tools.size;
    }

    /**
     * Generate tool descriptions for LLM prompt
     */
    generateToolPrompt(): string {
        const lines = this.getAllTools().map(t =>
            `- ${t.name}: ${t.description} (Args: ${JSON.stringify(t.inputSchema)})`
        );
        return lines.join('\n');
    }

    /**
     * Validate a plan's tools before execution
     */
    validatePlanTools(steps: Array<{ tool?: string; action?: string }>): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        for (const step of steps) {
            const toolName = step.tool || step.action;
            if (toolName && !this.hasTool(toolName)) {
                errors.push(`Unknown tool: '${toolName}'`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Find similar tool names (for error suggestions)
     */
    findSimilarTools(name: string): string[] {
        const allNames = this.getAllToolNames();
        return allNames
            .filter(n =>
                n.includes(name) ||
                name.includes(n) ||
                this.levenshteinDistance(n, name) <= 3
            )
            .slice(0, 3);
    }

    private levenshteinDistance(a: string, b: string): number {
        const matrix: number[][] = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    /**
     * Mark registry as initialized
     */
    setInitialized(): void {
        this.initialized = true;
        console.log(`[TOOL REGISTRY] 🛠️ Initialized with ${this.tools.size} tools`);
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Log registry status
     */
    logStatus(): void {
        console.log('[TOOL REGISTRY] 📋 Current Tools:');
        const bySource = new Map<string, string[]>();

        for (const tool of this.tools.values()) {
            if (!bySource.has(tool.source)) {
                bySource.set(tool.source, []);
            }
            bySource.get(tool.source)!.push(tool.name);
        }

        for (const [source, names] of bySource) {
            console.log(`  [${source}]: ${names.join(', ')}`);
        }
    }
}

// Singleton instance
let registryInstance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
    if (!registryInstance) {
        registryInstance = new ToolRegistry();
    }
    return registryInstance;
}

export default ToolRegistry;
