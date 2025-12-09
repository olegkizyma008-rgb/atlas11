/**
 * KONTUR CLI - Main Menu
 * Clean UI: no emojis, no borders, no circular navigation
 * Full system configuration: services, API keys, app settings
 */

import chalk from 'chalk';
import { select, input, confirm, secret } from './prompts.js';
import { configManager } from '../managers/config-manager.js';
import { modelRegistry } from '../managers/model-registry.js';
import ora from 'ora';

// Service definitions
const SERVICES = [
    { key: 'brain', label: 'Brain', desc: 'Chat and Planning' },
    { key: 'tts', label: 'TTS', desc: 'Text-to-Speech' },
    { key: 'stt', label: 'STT', desc: 'Speech-to-Text' },
    { key: 'vision', label: 'Vision', desc: 'Visual Analysis (Grisha)', hasMode: true },
    { key: 'reasoning', label: 'Reasoning', desc: 'Deep Thinking (Gemini 3)' }
] as const;

// Vision mode options
const VISION_MODES = [
    { value: 'live', label: 'Live Stream', desc: 'Gemini Live - continuous video stream for real-time observation' },
    { value: 'on-demand', label: 'On-Demand', desc: 'Screenshot after task - Copilot/GPT-4o analysis' }
];

// Available providers
const PROVIDERS = ['gemini', 'copilot', 'openai', 'anthropic', 'mistral'];

// Provider-specific API key names
const PROVIDER_API_KEYS: Record<string, string> = {
    gemini: 'GEMINI_API_KEY',
    copilot: 'COPILOT_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    mistral: 'MISTRAL_API_KEY'
};

/**
 * Display header
 */
function showHeader(title: string): void {
    console.clear();
    console.log(chalk.bold.cyan(`\n  KONTUR SYSTEM CONFIGURATOR`));
    console.log(chalk.gray(`  ${title}`));
    console.log(chalk.gray(`  ${'─'.repeat(45)}`));
    console.log('');
}

/**
 * Format value for display: show placeholder if empty
 */
function fmtVal(val: string | undefined, placeholder: string = 'not set'): string {
    return val ? chalk.green(val) : chalk.gray(placeholder);
}

/**
 * Format API key for display (masked)
 */
function fmtKey(val: string | undefined): string {
    if (!val) return chalk.red('not set');
    if (val.length > 10) return chalk.green(val.substring(0, 8) + '...');
    return chalk.green('***');
}

/**
 * Main menu
 */
export async function mainMenu(): Promise<void> {
    while (true) {
        showHeader('Main Menu');
        const config = configManager.getAll();

        // Build service status display
        const serviceChoices = SERVICES.map(s => {
            const provider = config[`${s.key.toUpperCase()}_PROVIDER`] || 'not set';
            const model = config[`${s.key.toUpperCase()}_MODEL`] || 'not set';
            return {
                name: `${s.label.padEnd(12)} ${chalk.gray(provider)} / ${chalk.cyan(model)}`,
                value: `service:${s.key}`
            };
        });

        const choices = [
            ...serviceChoices,
            { name: '─'.repeat(40), value: '_sep1', disabled: true },
            { name: 'API Keys', value: 'keys' },
            { name: 'App Settings', value: 'settings' },
            { name: 'System Health Check', value: 'health' },
            { name: '─'.repeat(40), value: '_sep2', disabled: true },
            { name: chalk.yellow('Exit'), value: 'exit' }
        ];

        const action = await select('', choices);

        if (action === 'exit') {
            console.log(chalk.gray('\n  Exiting...\n'));
            process.exit(0);
        }

        if (action.startsWith('service:')) {
            const serviceName = action.replace('service:', '');
            await configureService(serviceName);
        } else if (action === 'keys') {
            await configureAPIKeys();
        } else if (action === 'settings') {
            await configureAppSettings();
        } else if (action === 'health') {
            await runHealthCheck();
        }
    }
}

/**
 * Configure a specific service (provider + model + API key)
 */
async function configureService(service: string): Promise<void> {
    const serviceUpper = service.toUpperCase();
    const serviceInfo = SERVICES.find(s => s.key === service);
    const serviceName = serviceInfo?.label || service;

    // Vision has special configuration with separate Live and On-Demand
    if (service === 'vision') {
        await configureVision();
        return;
    }

    while (true) {
        showHeader(`Configure ${serviceName}`);
        console.log(chalk.gray(`  ${serviceInfo?.desc || ''}\n`));

        const config = configManager.getAll();
        const providerKey = `${serviceUpper}_PROVIDER`;
        const modelKey = `${serviceUpper}_MODEL`;
        const apiKeyKey = `${serviceUpper}_API_KEY`;
        const fallbackKey = `${serviceUpper}_FALLBACK_PROVIDER`;

        const currentProvider = config[providerKey];
        const currentModel = config[modelKey];
        const currentApiKey = config[apiKeyKey];
        const currentFallback = config[fallbackKey];

        // Also show global key if service-specific not set
        const effectiveApiKey = currentApiKey || config[PROVIDER_API_KEYS[currentProvider || 'gemini']] || config['GEMINI_API_KEY'];

        const choices: { name: string; value: string; disabled?: boolean | string }[] = [
            { name: `Provider         ${fmtVal(currentProvider)}`, value: 'provider' },
            { name: `Model            ${fmtVal(currentModel)}`, value: 'model' },
            { name: `API Key          ${fmtKey(currentApiKey)}${!currentApiKey && effectiveApiKey ? chalk.gray(' (using global)') : ''}`, value: 'apikey' },
            { name: `Fallback         ${currentFallback ? fmtVal(currentFallback) : chalk.gray('none')}`, value: 'fallback' },
            { name: '─'.repeat(35), value: '_sep', disabled: true },
            { name: 'Back', value: 'back' }
        ];

        const action = await select('', choices);

        if (action === 'back') return;

        switch (action) {
            case 'provider':
                await selectProvider(providerKey);
                break;
            case 'model':
                await selectModel(providerKey, modelKey);
                break;
            case 'apikey':
                await editApiKey(apiKeyKey, `${serviceName} API Key`);
                break;
            case 'fallback':
                await selectFallback(fallbackKey, config[providerKey]);
                break;
        }
    }
}

/**
 * Configure Vision - Special menu with separate Live and On-Demand settings
 */
async function configureVision(): Promise<void> {
    while (true) {
        showHeader('Configure Vision (Grisha)');
        console.log(chalk.gray('  Visual monitoring for task verification\n'));

        const config = configManager.getAll();
        const currentMode = config['VISION_MODE'] || 'live';
        const fallbackMode = config['VISION_FALLBACK_MODE'];

        const modeLabel = currentMode === 'live' ? chalk.cyan('Live Stream') : chalk.magenta('On-Demand');
        const fallbackLabel = fallbackMode === 'live' ? chalk.cyan('Live Stream') :
            fallbackMode === 'on-demand' ? chalk.magenta('On-Demand') :
                chalk.gray('none');

        // Live mode summary
        const liveProvider = config['VISION_LIVE_PROVIDER'] || 'gemini';
        const liveModel = config['VISION_LIVE_MODEL'] || 'gemini-2.5-flash-native-audio-preview-09-2025';

        // On-Demand mode summary
        const onDemandProvider = config['VISION_ONDEMAND_PROVIDER'] || 'copilot';
        const onDemandModel = config['VISION_ONDEMAND_MODEL'] || 'gpt-4o';

        const choices = [
            { name: `Active Mode      ${modeLabel}`, value: 'mode' },
            { name: `Fallback Mode    ${fallbackLabel}`, value: 'fallback_mode' },
            { name: '─'.repeat(35), value: '_sep1', disabled: true },
            { name: `Live Stream      ${chalk.gray(liveProvider)} / ${chalk.cyan(liveModel.slice(0, 25))}...`, value: 'live' },
            { name: `On-Demand        ${chalk.gray(onDemandProvider)} / ${chalk.magenta(onDemandModel)}`, value: 'ondemand' },
            { name: '─'.repeat(35), value: '_sep2', disabled: true },
            { name: 'Back', value: 'back' }
        ];

        const action = await select('', choices);

        if (action === 'back') return;

        switch (action) {
            case 'mode':
                await selectVisionMode('VISION_MODE');
                break;
            case 'fallback_mode':
                await selectVisionFallbackMode('VISION_FALLBACK_MODE', currentMode);
                break;
            case 'live':
                await configureVisionMode('Live Stream', 'VISION_LIVE');
                break;
            case 'ondemand':
                await configureVisionMode('On-Demand', 'VISION_ONDEMAND');
                break;
        }
    }
}

/**
 * Configure a specific Vision mode (Live or On-Demand)
 */
async function configureVisionMode(label: string, prefix: string): Promise<void> {
    while (true) {
        showHeader(`Vision: ${label}`);

        const config = configManager.getAll();
        const providerKey = `${prefix}_PROVIDER`;
        const modelKey = `${prefix}_MODEL`;
        const fallbackKey = `${prefix}_FALLBACK_PROVIDER`;
        const apiKeyKey = `${prefix}_API_KEY`;

        const currentProvider = config[providerKey];
        const currentModel = config[modelKey];
        const currentFallback = config[fallbackKey];
        const currentApiKey = config[apiKeyKey];

        // Effective API key (fallback to provider-specific or global)
        const effectiveApiKey = currentApiKey ||
            config[PROVIDER_API_KEYS[currentProvider || 'gemini']] ||
            config['GEMINI_API_KEY'] ||
            config['GEMINI_LIVE_API_KEY'];

        const choices = [
            { name: `Provider         ${fmtVal(currentProvider)}`, value: 'provider' },
            { name: `Model            ${fmtVal(currentModel)}`, value: 'model' },
            { name: `Fallback         ${currentFallback ? fmtVal(currentFallback) : chalk.gray('none')}`, value: 'fallback' },
            { name: `API Key          ${fmtKey(currentApiKey)}${!currentApiKey && effectiveApiKey ? chalk.gray(' (using global)') : ''}`, value: 'apikey' },
            { name: '─'.repeat(35), value: '_sep', disabled: true },
            { name: 'Back', value: 'back' }
        ];

        const action = await select('', choices);

        if (action === 'back') return;

        switch (action) {
            case 'provider':
                await selectProvider(providerKey);
                break;
            case 'model':
                await selectModel(providerKey, modelKey);
                break;
            case 'fallback':
                await selectFallback(fallbackKey, config[providerKey]);
                break;
            case 'apikey':
                await editApiKey(apiKeyKey, `${label} API Key`);
                break;
        }
    }
}

/**
 * Select provider for a service
 */
async function selectProvider(providerKey: string): Promise<void> {
    const choices = PROVIDERS.map(p => ({ name: p, value: p }));
    choices.push({ name: 'Back', value: 'back' });

    const selected = await select('Provider', choices);
    if (selected !== 'back') {
        configManager.set(providerKey, selected);
    }
}

/**
 * Select model for a service
 */
async function selectModel(providerKey: string, modelKey: string): Promise<void> {
    const provider = configManager.get(providerKey);

    if (!provider) {
        console.log(chalk.red('\n  Please set a provider first.\n'));
        await new Promise(r => setTimeout(r, 1500));
        return;
    }

    const spinner = ora('Fetching models...').start();

    try {
        const apiKey = getEffectiveApiKey(provider);
        const models = await modelRegistry.fetchModels(provider, apiKey);
        spinner.stop();

        if (models.length === 0) {
            console.log(chalk.yellow('\n  No models available for this provider.\n'));
            await new Promise(r => setTimeout(r, 1500));
            return;
        }

        const choices = models.map(m => ({
            name: `${m.name}${m.id !== m.name ? chalk.gray(` (${m.id})`) : ''}`,
            value: m.id
        }));
        choices.push({ name: 'Back', value: 'back' });

        const selected = await select('Model', choices, { pageSize: 20 });
        if (selected !== 'back') {
            configManager.set(modelKey, selected);
        }
    } catch (e: any) {
        spinner.fail(`Failed to fetch models: ${e.message}`);
        await new Promise(r => setTimeout(r, 2000));
    }
}

/**
 * Edit API key for a service
 */
async function editApiKey(keyName: string, label: string): Promise<void> {
    const current = configManager.get(keyName);
    console.log(chalk.gray(`\n  Current: ${current ? current.substring(0, 15) + '...' : 'not set'}`));

    const value = await input(`${label}`, current);
    if (value && value !== current) {
        configManager.set(keyName, value);
        console.log(chalk.green('\n  Saved!'));
        await new Promise(r => setTimeout(r, 800));
    }
}

/**
 * Select Vision mode (live vs on-demand)
 */
async function selectVisionMode(modeKey: string): Promise<void> {
    const choices = [
        ...VISION_MODES.map(m => ({
            name: `${m.label.padEnd(15)} ${chalk.gray(m.desc)}`,
            value: m.value
        })),
        { name: 'Back', value: 'back' }
    ];

    const selected = await select('Vision Mode', choices);
    if (selected !== 'back') {
        configManager.set(modeKey, selected);

        // Hint about recommended providers for each mode
        if (selected === 'live') {
            console.log(chalk.gray('\n  Tip: Live mode works best with Gemini as primary provider.'));
        } else if (selected === 'on-demand') {
            console.log(chalk.gray('\n  Tip: On-demand mode works with Copilot (GPT-4o) or Gemini.'));
        }
        await new Promise(r => setTimeout(r, 1200));
    }
}

/**
 * Select Vision fallback mode
 */
async function selectVisionFallbackMode(modeKey: string, currentMode: string): Promise<void> {
    // Fallback can be the opposite mode or none
    const choices = [
        { name: `None             ${chalk.gray('No fallback - fail if primary unavailable')}`, value: '' },
        ...VISION_MODES
            .filter(m => m.value !== currentMode) // Exclude current active mode
            .map(m => ({
                name: `${m.label.padEnd(15)} ${chalk.gray(m.desc)}`,
                value: m.value
            })),
        { name: 'Back', value: 'back' }
    ];

    const selected = await select('Fallback Mode', choices);
    if (selected !== 'back') {
        configManager.set(modeKey, selected);
        if (selected === '') {
            console.log(chalk.gray('\n  Fallback disabled. Vision will fail if primary mode is unavailable.'));
        } else {
            console.log(chalk.green(`\n  Fallback set to ${selected}. Will switch automatically if primary fails.`));
        }
        await new Promise(r => setTimeout(r, 1200));
    }
}

/**
 * Select fallback provider
 */
async function selectFallback(fallbackKey: string, primaryProvider?: string): Promise<void> {
    const availableProviders = PROVIDERS.filter(p => p !== primaryProvider);
    const choices = [
        { name: 'None', value: '' },
        ...availableProviders.map(p => ({ name: p, value: p })),
        { name: 'Back', value: 'back' }
    ];

    const selected = await select('Fallback Provider', choices);
    if (selected !== 'back') {
        if (selected === '') {
            // Remove fallback by setting empty
            configManager.set(fallbackKey, '');
        } else {
            configManager.set(fallbackKey, selected);
        }
    }
}

/**
 * Get effective API key for a provider
 */
function getEffectiveApiKey(provider: string): string {
    const config = configManager.getAll();
    // Try provider-specific key
    const providerKeyName = PROVIDER_API_KEYS[provider];
    if (config[providerKeyName]) return config[providerKeyName];
    // Fallback to GEMINI_API_KEY
    return config['GEMINI_API_KEY'] || '';
}

/**
 * Configure global API keys
 */
async function configureAPIKeys(): Promise<void> {
    const keysList = [
        { key: 'GEMINI_API_KEY', label: 'Gemini (Default)' },
        { key: 'GEMINI_LIVE_API_KEY', label: 'Gemini Live (Vision/Grisha)' },
        { key: 'REASONING_API_KEY', label: 'Reasoning (Gemini 3)' },
        { key: 'COPILOT_API_KEY', label: 'GitHub Copilot' },
        { key: 'OPENAI_API_KEY', label: 'OpenAI' },
        { key: 'ANTHROPIC_API_KEY', label: 'Anthropic' },
        { key: 'MISTRAL_API_KEY', label: 'Mistral' }
    ];

    while (true) {
        showHeader('API Keys');
        const config = configManager.getAll();

        const choices: { name: string; value: string; disabled?: boolean }[] = keysList.map(k => ({
            name: `${k.label.padEnd(28)} ${fmtKey(config[k.key])}`,
            value: k.key
        }));
        choices.push({ name: '─'.repeat(35), value: '_sep', disabled: true });
        choices.push({ name: 'Back', value: 'back' });

        const selected = await select('', choices);
        if (selected === 'back') return;

        const keyInfo = keysList.find(k => k.key === selected);
        const current = configManager.get(selected);
        console.log(chalk.gray(`\n  Current: ${current ? current.substring(0, 20) + '...' : 'not set'}`));

        const value = await input(`${keyInfo?.label || selected}`, current);
        if (value) {
            configManager.set(selected, value);
            console.log(chalk.green('\n  Saved!'));
            await new Promise(r => setTimeout(r, 600));
        }
    }
}

/**
 * Configure application settings
 */
async function configureAppSettings(): Promise<void> {
    while (true) {
        showHeader('App Settings');
        const config = configManager.getAll();

        const visionAutoStart = config['VISION_AUTO_START'] || 'true';
        const language = config['APP_LANGUAGE'] || 'uk';
        const theme = config['APP_THEME'] || 'dark';

        const choices = [
            { name: `Language         ${language === 'uk' ? chalk.cyan('Українська') : chalk.gray('English')}`, value: 'APP_LANGUAGE' },
            { name: `Theme            ${theme === 'dark' ? chalk.magenta('Dark') : chalk.yellow('Light')}`, value: 'APP_THEME' },
            { name: `Vision autostart ${visionAutoStart === 'true' ? chalk.green('on') : chalk.gray('off')}`, value: 'VISION_AUTO_START' },
            { name: '─'.repeat(35), value: '_sep1', disabled: true },
            { name: `NODE_ENV         ${fmtVal(config['NODE_ENV'], 'development')}`, value: 'NODE_ENV' },
            { name: `LOG_LEVEL        ${fmtVal(config['LOG_LEVEL'], 'info')}`, value: 'LOG_LEVEL' },
            { name: `DEBUG            ${fmtVal(config['DEBUG'], 'false')}`, value: 'DEBUG' },
            { name: '─'.repeat(35), value: '_sep2', disabled: true },
            { name: 'Back', value: 'back' }
        ];

        const selected = await select('', choices);
        if (selected === 'back') return;

        switch (selected) {
            case 'APP_LANGUAGE': {
                const langChoices = [
                    { name: `Українська       ${chalk.gray('Системні повідомлення українською')}`, value: 'uk' },
                    { name: `English          ${chalk.gray('System messages in English')}`, value: 'en' },
                    { name: 'Back', value: 'back' }
                ];
                const lang = await select('Language', langChoices);
                if (lang !== 'back') configManager.set('APP_LANGUAGE', lang);
                break;
            }
            case 'APP_THEME': {
                const themeChoices = [
                    { name: `Dark             ${chalk.gray('Темна тема (рекомендовано)')}`, value: 'dark' },
                    { name: `Light            ${chalk.gray('Світла тема')}`, value: 'light' },
                    { name: 'Back', value: 'back' }
                ];
                const t = await select('Theme', themeChoices);
                if (t !== 'back') configManager.set('APP_THEME', t);
                break;
            }
            case 'VISION_AUTO_START': {
                const autoChoices = [
                    { name: `On               ${chalk.gray('Grisha активується автоматично')}`, value: 'true' },
                    { name: `Off              ${chalk.gray('Grisha потрібно запускати вручну')}`, value: 'false' },
                    { name: 'Back', value: 'back' }
                ];
                const auto = await select('Vision Auto Start', autoChoices);
                if (auto !== 'back') configManager.set('VISION_AUTO_START', auto);
                break;
            }
            case 'NODE_ENV': {
                const envChoices = [
                    { name: 'development', value: 'development' },
                    { name: 'production', value: 'production' },
                    { name: 'test', value: 'test' },
                    { name: 'Back', value: 'back' }
                ];
                const env = await select('Environment', envChoices);
                if (env !== 'back') configManager.set('NODE_ENV', env);
                break;
            }
            case 'LOG_LEVEL': {
                const logChoices = [
                    { name: 'debug', value: 'debug' },
                    { name: 'info', value: 'info' },
                    { name: 'warn', value: 'warn' },
                    { name: 'error', value: 'error' },
                    { name: 'Back', value: 'back' }
                ];
                const level = await select('Log Level', logChoices);
                if (level !== 'back') configManager.set('LOG_LEVEL', level);
                break;
            }
            case 'DEBUG': {
                const debugChoices = [
                    { name: 'true', value: 'true' },
                    { name: 'false', value: 'false' },
                    { name: 'Back', value: 'back' }
                ];
                const debug = await select('Debug Mode', debugChoices);
                if (debug !== 'back') configManager.set('DEBUG', debug);
                break;
            }
        }
    }
}

/**
 * Run health check on all services
 */
async function runHealthCheck(): Promise<void> {
    showHeader('System Health Check');
    console.log(chalk.gray('  Checking all services...\n'));

    const config = configManager.getAll();
    let okCount = 0;
    let warnCount = 0;
    let errorCount = 0;

    // Check standard services
    for (const service of SERVICES) {
        const prefix = service.key.toUpperCase();
        const provider = config[`${prefix}_PROVIDER`] || 'not set';

        // Determine which API key to use
        let apiKey = config[`${prefix}_API_KEY`];
        if (!apiKey) {
            apiKey = config[PROVIDER_API_KEYS[provider]] || config['GEMINI_API_KEY'];
        }

        let status: string;
        let statusSymbol: string;

        if (!provider || provider === 'not set') {
            status = chalk.gray('Not configured');
            statusSymbol = chalk.gray('○');
            warnCount++;
        } else if (!apiKey) {
            status = chalk.yellow('No API key');
            statusSymbol = chalk.yellow('△');
            warnCount++;
        } else if (provider === 'gemini') {
            const spinner = ora({ text: `Testing ${service.label}...`, prefixText: '  ' }).start();
            try {
                const { GoogleGenAI } = await import('@google/genai');
                const client = new GoogleGenAI({ apiKey });
                await client.models.list();
                spinner.stop();
                status = chalk.green('Connected');
                statusSymbol = chalk.green('●');
                okCount++;
            } catch (e: any) {
                spinner.stop();
                if (e.message?.includes('expired')) {
                    status = chalk.red('Key Expired');
                } else {
                    status = chalk.red(`Error: ${e.message?.substring(0, 25)}`);
                }
                statusSymbol = chalk.red('✕');
                errorCount++;
            }
        } else if (provider === 'copilot') {
            const spinner = ora({ text: `Testing ${service.label}...`, prefixText: '  ' }).start();
            try {
                const { VSCodeCopilotProvider } = await import('../../kontur/providers/copilot.js');
                const cp = new VSCodeCopilotProvider(apiKey);
                const models = await cp.fetchModels();
                spinner.stop();
                if (models.length > 0) {
                    status = chalk.green('Connected');
                    statusSymbol = chalk.green('●');
                    okCount++;
                } else {
                    status = chalk.yellow('No models');
                    statusSymbol = chalk.yellow('△');
                    warnCount++;
                }
            } catch (e: any) {
                spinner.stop();
                status = chalk.red(`Error: ${e.message?.substring(0, 25)}`);
                statusSymbol = chalk.red('✕');
                errorCount++;
            }
        } else {
            status = chalk.blue('Configured');
            statusSymbol = chalk.blue('●');
            okCount++;
        }

        console.log(`  ${statusSymbol} ${service.label.padEnd(12)} ${chalk.gray(provider.padEnd(10))} ${status}`);
    }

    // Vision mode info
    console.log(chalk.gray('\n  ─── Vision Details ───'));
    const visionMode = config['VISION_MODE'] || 'live';
    const fallbackMode = config['VISION_FALLBACK_MODE'];
    console.log(`  Mode: ${visionMode === 'live' ? chalk.cyan('Live Stream') : chalk.magenta('On-Demand')}`);
    if (fallbackMode) {
        console.log(`  Fallback: ${fallbackMode === 'live' ? chalk.cyan('Live Stream') : chalk.magenta('On-Demand')}`);
    } else {
        console.log(`  Fallback: ${chalk.gray('none')}`);
    }

    // Summary
    console.log(chalk.gray('\n  ─── Summary ───'));
    console.log(`  ${chalk.green('●')} OK: ${okCount}  ${chalk.yellow('△')} Warn: ${warnCount}  ${chalk.red('✕')} Error: ${errorCount}`);

    // Overall status
    if (errorCount > 0) {
        console.log(chalk.red('\n  ⚠ System has errors. Check API keys.'));
    } else if (warnCount > 0) {
        console.log(chalk.yellow('\n  △ System partially configured.'));
    } else {
        console.log(chalk.green('\n  ✓ System ready!'));
    }

    console.log('');
    await input('Press Enter to return...');
}

