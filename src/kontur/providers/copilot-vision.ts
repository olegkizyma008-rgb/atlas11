/**
 * Copilot Vision Provider
 * Uses GitHub Copilot (GPT-4o) for image analysis
 * On-demand mode: analyzes screenshots after task execution
 */

import { IVisionProvider, VisionRequest, VisionResponse, ProviderName } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class CopilotVisionProvider implements IVisionProvider {
    readonly name: ProviderName = 'copilot';
    private token: string | null = null;
    private model: string = 'gpt-4o'; // GPT-4o has vision capabilities

    constructor(apiKey?: string, model?: string) {
        if (model) this.model = model;

        if (apiKey) {
            this.token = apiKey;
            console.log('[COPILOT VISION] ✅ Using provided API key');
        } else {
            this.initializeToken();
        }
    }

    private initializeToken() {
        // 0. Check env var (Standard for Atlas)
        if (process.env.COPILOT_API_KEY) {
            this.token = process.env.COPILOT_API_KEY;
            console.log('[COPILOT VISION] ✅ Found token in env');
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
                    console.log('[COPILOT VISION] ✅ Found token in gh CLI config');
                    return;
                }
            } catch (e) {
                console.warn('[COPILOT VISION] Failed to parse gh hosts.yml', e);
            }
        }

        // 2. Try ~/.config/github-copilot/apps.json (CLI/Shared)
        const appsJsonPath = path.join(os.homedir(), '.config', 'github-copilot', 'apps.json');
        if (fs.existsSync(appsJsonPath)) {
            try {
                const content = JSON.parse(fs.readFileSync(appsJsonPath, 'utf-8'));
                for (const key in content) {
                    if (content[key].oauth_token) {
                        this.token = content[key].oauth_token;
                        console.log('[COPILOT VISION] ✅ Found token in apps.json');
                        return;
                    }
                }
            } catch (e) {
                console.warn('[COPILOT VISION] Failed to parse apps.json');
            }
        }

        // 3. Try ~/.config/github-copilot/hosts.json (Goose/Copilot CLI path)
        const hostsJsonPath = path.join(os.homedir(), '.config', 'github-copilot', 'hosts.json');
        if (fs.existsSync(hostsJsonPath)) {
            try {
                const content = JSON.parse(fs.readFileSync(hostsJsonPath, 'utf-8'));
                if (content['github.com']?.oauth_token) {
                    this.token = content['github.com'].oauth_token;
                    console.log('[COPILOT VISION] ✅ Found token in hosts.json');
                    return;
                }
            } catch (e) {
                console.warn('[COPILOT VISION] Failed to parse hosts.json');
            }
        }

        console.warn('[COPILOT VISION] ⚠️ No Copilot token found');
    }

    isAvailable(): boolean {
        return !!this.token;
    }

    async analyzeImage(request: VisionRequest): Promise<VisionResponse> {
        if (!this.token) {
            throw new Error('Copilot Vision provider not initialized - no token found');
        }

        console.log('[COPILOT VISION] 🖼️ Analyzing image...');

        try {
            // Step 1: Get session token
            // Note: GitHub Copilot API requires special authentication
            // For now, we'll use a fallback approach
            let sessionToken = this.token;
            
            try {
                const tokenResponse = await fetch('https://api.github.com/copilot_internal/v2/token', {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Editor-Version': 'vscode/1.85.0',
                        'Editor-Plugin-Version': 'copilot/1.144.0',
                        'User-Agent': 'GithubCopilot/1.144.0'
                    }
                });

                if (tokenResponse.ok) {
                    const data = await tokenResponse.json();
                    sessionToken = data.token;
                } else {
                    console.warn('[COPILOT VISION] ⚠️ Could not get session token, using direct token');
                }
            } catch (e) {
                console.warn('[COPILOT VISION] ⚠️ Token refresh failed, using direct token');
            }

            // Step 2: Vision Analysis via Chat Completions with image
            const systemPrompt = `You are GRISHA, the Security Guardian of the ATLAS System.
Your task is to analyze screenshots and verify task execution.

RESPOND IN UKRAINIAN LANGUAGE ONLY.

Analyze the image for:
1. VERIFICATION: Did the requested action complete successfully?
2. SECURITY: Any phishing, fake dialogs, or suspicious elements?
3. ERRORS: Any error dialogs, crash screens, or warnings?
4. BLOCKERS: Popups that might block further actions?

Return JSON:
{
  "analysis": "Brief Ukrainian description of what you see",
  "anomalies": [
    { "type": "string", "severity": "low|medium|high", "description": "string", "location": "string" }
  ],
  "confidence": 0.0-1.0,
  "verified": true/false
}`;

            const userPrompt = request.prompt ||
                (request.taskContext
                    ? `Перевір виконання завдання: "${request.taskContext}". Що бачиш на екрані?`
                    : 'Проаналізуй цей скріншот. Що ти бачиш? Чи все в нормі?');

            const response = await fetch('https://api.githubcopilot.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sessionToken}`,
                    'Content-Type': 'application/json',
                    'Editor-Version': 'vscode/1.85.0',
                    'Copilot-Vision-Request': 'true' // REQUIRED for vision!
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: userPrompt },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:${request.mimeType || 'image/jpeg'};base64,${request.image}`
                                    }
                                }
                            ]
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 1024
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Copilot Vision API error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            const text = data.choices[0]?.message?.content || '';

            // Parse JSON response
            try {
                // Extract JSON from response (might be wrapped in markdown)
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        analysis: parsed.analysis || text,
                        anomalies: parsed.anomalies || [],
                        confidence: parsed.confidence || 0.8,
                        verified: parsed.verified ?? true,
                        provider: this.name
                    };
                }
            } catch (parseError) {
                console.warn('[COPILOT VISION] Failed to parse JSON response, using raw text');
            }

            // Fallback: return raw text analysis
            return {
                analysis: text,
                anomalies: [],
                confidence: 0.7,
                verified: !text.toLowerCase().includes('error') && !text.toLowerCase().includes('помилка'),
                provider: this.name
            };

        } catch (error: any) {
            console.error('[COPILOT VISION] ❌ Error:', error.message);
            console.warn('[COPILOT VISION] ⚠️ Falling back to Gemini Vision');
            
            // Fallback to Gemini Vision
            try {
                const { GeminiVisionProvider } = await import('./gemini-vision');
                const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_LIVE_API_KEY;
                if (geminiKey) {
                    const geminiProvider = new GeminiVisionProvider(geminiKey);
                    return await geminiProvider.analyzeImage(request);
                }
            } catch (fallbackError) {
                console.error('[COPILOT VISION] ❌ Fallback to Gemini also failed:', fallbackError);
            }
            
            throw error;
        }
    }

    getModels(): string[] {
        return [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-vision-preview',
            'claude-sonnet-4'
        ];
    }

    async fetchModels(): Promise<string[]> {
        return this.getModels();
    }
}
