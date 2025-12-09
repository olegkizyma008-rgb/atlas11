/**
 * KONTUR CLI - Display Utilities
 * Formatting and display helpers
 */

import chalk from 'chalk';

export const SERVICES = [
    { key: 'brain', name: '🧠 Brain', desc: 'Чат та планування' },
    { key: 'tts', name: '🔊 TTS', desc: 'Генерація голосу' },
    { key: 'stt', name: '🎤 STT', desc: 'Розпізнавання мови' },
    { key: 'vision', name: '👁️  Vision', desc: 'Live стрім (GRISHA)' },
    { key: 'reasoning', name: '🤔 Reasoning', desc: 'Глибоке мислення' }
] as const;

export const PROVIDERS = [
    { key: 'gemini', name: 'Google Gemini', sdk: '@google/genai' },
    { key: 'openai', name: 'OpenAI', sdk: 'openai' },
    { key: 'anthropic', name: 'Anthropic Claude', sdk: '@anthropic-ai/sdk' },
    { key: 'mistral', name: 'Mistral AI', sdk: '@mistralai/mistralai' }
] as const;

export const MODELS: Record<string, string[]> = {
    gemini: [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-2.5-flash-preview-tts',
        'gemini-2.5-flash-native-audio-preview-09-2025',
        'gemini-3-pro-preview'
    ],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-5-sonnet-latest', 'claude-3-opus', 'claude-3-haiku'],
    mistral: ['mistral-large-latest', 'mistral-medium', 'mistral-small']
};

export function header(): void {
    console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.white('        KONTUR SYSTEM CONFIGURATOR              ') + chalk.cyan('║'));
    console.log(chalk.cyan('╚═══════════════════════════════════════════════════╝\n'));
}

export function success(msg: string): void {
    console.log(chalk.green('✅ ') + msg);
}

export function error(msg: string): void {
    console.log(chalk.red('❌ ') + msg);
}

export function info(msg: string): void {
    console.log(chalk.blue('ℹ️  ') + msg);
}

export function warn(msg: string): void {
    console.log(chalk.yellow('⚠️  ') + msg);
}

export function table(data: Array<{ label: string; value: string }>): void {
    const maxLabel = Math.max(...data.map(d => d.label.length));
    data.forEach(({ label, value }) => {
        const padding = ' '.repeat(maxLabel - label.length);
        console.log(`  ${chalk.gray(label)}${padding}  ${chalk.white(value)}`);
    });
}

export function divider(): void {
    console.log(chalk.gray('─'.repeat(50)));
}
