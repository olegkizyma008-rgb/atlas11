/**
 * VS Code Copilot Provider
 * Extracts credentials from VS Code storage/config and provides access to Copilot models
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { ILLMProvider, LLMRequest, LLMResponse, ProviderName } from './types';

export class VSCodeCopilotProvider implements ILLMProvider {
    readonly name: ProviderName = 'copilot';
    private token: string | null = null;
    private defaultModel: string = 'gpt-4';

    constructor(apiKey?: string) {
        if (apiKey) {
            this.token = apiKey;
            console.log('[COPILOT PROVIDER] ✅ Using manual API key');
        } else {
            this.initializeToken();
        }
    }

    private initializeToken() {
        // 0. Check env var (Standard for Atlas)
        if (process.env.COPILOT_API_KEY) {
            this.token = process.env.COPILOT_API_KEY;
            console.log('[COPILOT PROVIDER] ✅ Found token in env (COPILOT_API_KEY)');
            return;
        }

        // 1. Try ~/.config/gh/hosts.yml (GitHub CLI path) - High Priority
        const ghHostsPath = path.join(os.homedir(), '.config', 'gh', 'hosts.yml');
        if (fs.existsSync(ghHostsPath)) {
            try {
                const content = fs.readFileSync(ghHostsPath, 'utf-8');
                // Simple parsing for "oauth_token: gho_..." under github.com
                const match = content.match(/oauth_token:\s+(gh[op]_[A-Za-z0-9_]+)/);
                if (match && match[1]) {
                    this.token = match[1];
                    console.log('[COPILOT PROVIDER] ✅ Found token in gh CLI config');
                    return;
                }
            } catch (e) {
                console.warn('[COPILOT PROVIDER] Failed to parse gh hosts.yml', e);
            }
        }

        // 2. Try ~/.config/github-copilot/apps.json (CLI/Shared)
        const appsJsonPath = path.join(os.homedir(), '.config', 'github-copilot', 'apps.json');
        if (fs.existsSync(appsJsonPath)) {
            try {
                const content = JSON.parse(fs.readFileSync(appsJsonPath, 'utf-8'));
                // Structure: {"github.com:...": { "oauth_token": "..." }}
                for (const key in content) {
                    if (content[key].oauth_token) {
                        this.token = content[key].oauth_token;
                        console.log('[COPILOT PROVIDER] ✅ Found token in apps.json');
                        return;
                    }
                }
            } catch (e) {
                console.warn('[COPILOT PROVIDER] Failed to parse apps.json', e);
            }
        }

        // 3. Try ~/.config/github-copilot/hosts.json (Goose/Copilot CLI path)
        const hostsJsonPath = path.join(os.homedir(), '.config', 'github-copilot', 'hosts.json');
        if (fs.existsSync(hostsJsonPath)) {
            try {
                const content = JSON.parse(fs.readFileSync(hostsJsonPath, 'utf-8'));
                // Structure: {"github.com": { "oauth_token": "..." }}
                if (content['github.com']?.oauth_token) {
                    this.token = content['github.com'].oauth_token;
                    console.log('[COPILOT PROVIDER] ✅ Found token in hosts.json');
                    return;
                }
            } catch (e) {
                console.warn('[COPILOT PROVIDER] Failed to parse hosts.json', e);
            }
        }

        console.warn('[COPILOT PROVIDER] ⚠️ No Copilot token found. Please install GitHub Copilot CLI or extension.');
    }

    isAvailable(): boolean {
        return !!this.token;
    }

    async generate(request: LLMRequest): Promise<LLMResponse> {
        if (!this.token) {
            throw new Error('Copilot provider not initialized - no token found');
        }

        const model = request.model || this.defaultModel;

        try {
            // Step 1: Get Token
            const tokenResponse = await fetch('https://api.github.com/copilot_internal/v2/token', {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Editor-Version': 'vscode/1.85.0',
                    'Editor-Plugin-Version': 'copilot/1.144.0',
                    'User-Agent': 'GithubCopilot/1.144.0'
                }
            });

            if (!tokenResponse.ok) {
                throw new Error(`Failed to authenticate with Copilot: ${tokenResponse.status}`);
            }

            const { token: sessionToken } = await tokenResponse.json();

            // Step 2: Chat Completion
            const response = await fetch('https://api.githubcopilot.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sessionToken}`,
                    'Content-Type': 'application/json',
                    'Editor-Version': 'vscode/1.85.0'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: request.systemPrompt || 'You are a helpful AI assistant.' },
                        { role: 'user', content: request.prompt }
                    ],
                    temperature: request.temperature || 0.7,
                    max_tokens: request.maxTokens || 2048,
                    stream: false
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Copilot API error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            const text = data.choices[0]?.message?.content || '';

            return {
                text,
                usage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                }
            };

        } catch (error: any) {
            console.error('[COPILOT PROVIDER] ❌ Error:', error.message);
            throw error;
        }
    }

    async fetchModels(): Promise<string[]> {
        if (!this.token) return [];

        try {
            // Check auth by getting token
            const tokenResponse = await fetch('https://api.github.com/copilot_internal/v2/token', {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Editor-Version': 'vscode/1.85.0',
                    'Editor-Plugin-Version': 'copilot/1.144.0',
                    'User-Agent': 'GithubCopilot/1.144.0'
                }
            });

            if (tokenResponse.ok) {
                // Try to get user login for better UX
                try {
                    const userResp = await fetch('https://api.github.com/user', {
                        headers: {
                            'Authorization': `token ${this.token}`,
                            'User-Agent': 'Atlas-Agent'
                        }
                    });
                    if (userResp.ok) {
                        const user = await userResp.json();
                        console.log(`[COPILOT] ✅ Authenticated as GitHub user: ${user.login}`);
                    }
                } catch (e) {
                    // Ignore user fetch errors
                }

                return [
                    'gpt-4',
                    'gpt-4o',
                    'gpt-3.5-turbo',
                    'claude-3.5-sonnet'
                ];
            }
            return [];
        } catch (error) {
            console.error('[COPILOT PROVIDER] Failed to fetch models:', error);
            return [];
        }
    }
}
