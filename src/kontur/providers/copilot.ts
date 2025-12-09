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

        // 1. Try ~/.config/github-copilot/apps.json (CLI/Shared)
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

        // 2. Try ~/.config/github-copilot/hosts.json (Goose path)
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

        // 3. Fallback: Check environment variable
        if (process.env.COPILOT_API_KEY) {
            this.token = process.env.COPILOT_API_KEY;
            console.log('[COPILOT PROVIDER] ✅ Found token in env');
            return;
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
            // First, we need to get a session token (optional for some endpoints, but good practice)
            // But usually the oauth_token works directly with the proxy or we need to exchange it.
            // "Goose" and others often query https://api.githubcopilot.com/chat/completions directly with the token.
            // But standard Copilot flow invokes a token exchange first (to get a short-lived bearer token).

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
                    stop: typeof request.maxTokens === 'undefined' ? undefined : (request.maxTokens ? null : null)
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
                    promptTokens: 0, // Copilot API might not return this standard usage
                    completionTokens: 0,
                    totalTokens: 0
                },
                model,
                provider: this.name
            };

        } catch (error: any) {
            console.error(`[COPILOT PROVIDER] ❌ Error:`, error.message);
            throw error;
        }
    }

    getModels(): string[] {
        // Copilot supports these standard models
        return [
            'gpt-4.1',
            'gpt-4o',
            'gpt-5-mini',
            'grok-code-fast-1',
            'raptor-mini',
            'claude-haiku-4.5',
            'claude-opus-4.5',
            'claude-sonnet-4',
            'claude-sonnet-4.5',
            'gemini-2.5-pro',
            'gemini-3-pro',
            'gpt-5',
            'gpt-5-codex',
            'gpt-5.1',
            'gpt-5.1-codex',
            'gpt-5.1-codex-max',
            'gpt-5.1-codex-mini'
        ];
    }

    // Attempt dynamic fetch via models endpoint if accessible
    async fetchModels(): Promise<string[]> {
        if (!this.token) {
            console.warn('[COPILOT] Cannot fetch models: No token');
            return [];
        }

        try {
            console.log('[COPILOT] 🔄 Verifying token...');

            // 1. Verify standard GitHub Auth first (for gho_ tokens)
            const userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'User-Agent': 'GithubCopilot/1.144.0'
                }
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                console.log(`[COPILOT] ✅ Authenticated as GitHub user: ${userData.login}`);

                // We have a valid GitHub token. 
                // It might take a moment to be usable for Copilot or require exchange.
                // For the purpose of "Auto-Load", this is enough proof of connectivity.
                return this.getModels();
            }

            // 2. If standard auth fails, try Copilot-specific endpoint (backup)
            const response = await fetch('https://api.github.com/copilot_internal/v2/token', {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'User-Agent': 'GithubCopilot/1.144.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Invalid Token (Status: ${response.status})`);
            }

            console.log('[COPILOT] ✅ Token verified successfully!');
            return this.getModels();

        } catch (error: any) {
            console.error('[COPILOT] ❌ Verification failed:', error.message);
            // Return empty to indicate failure in UI
            return [];
        }
    }
}
