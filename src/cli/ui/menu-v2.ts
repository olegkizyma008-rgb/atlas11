/**
 * KONTUR CLI v2 - Unified Configuration System
 * Clean design without emojis, structured configuration management
 * Enable/disable/delete operations for all services
 */

import chalk from 'chalk';
import ora from 'ora';
import { select, input, confirm } from './prompts.js';
import { configManager } from '../managers/config-manager.js';
import { modelRegistry } from '../managers/model-registry.js';
import { selectConfigItems, manageConfigItem, displayConfigSummary, ConfigSection, ConfigItem } from './config-list.js';
import { displayRagStatus, displayRagSearch, getRagIndexStatus } from './rag-status.js';

// Service definitions
const SERVICES = [
    { key: 'brain', label: 'Brain', desc: 'Chat and Planning' },
    { key: 'tts', label: 'TTS', desc: 'Text-to-Speech' },
    { key: 'stt', label: 'STT', desc: 'Speech-to-Text' },
    { key: 'vision', label: 'Vision', desc: 'Visual Analysis (Grisha)' },
    { key: 'reasoning', label: 'Reasoning', desc: 'Deep Thinking' },
    { key: 'execution', label: 'Execution', desc: 'Agent Engine' }
] as const;

const PROVIDERS = ['gemini', 'copilot', 'openai', 'anthropic', 'mistral', 'web', 'ukrainian'];

const PROVIDER_API_KEYS: Record<string, string> = {
    gemini: 'GEMINI_API_KEY',
    copilot: 'COPILOT_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    mistral: 'MISTRAL_API_KEY'
};

/**
 * Display header with title and decorative elements
 */
function showHeader(title: string): void {
    console.clear();
    // Blue arc decoration
    console.log(chalk.cyan('  ◆─────────────────────────────────────◆'));
    console.log(chalk.cyan(`  │ ${chalk.green('●')} ${title.padEnd(36)} ${chalk.green('●')} │`));
    console.log(chalk.cyan('  ◆─────────────────────────────────────◆'));
    console.log('');
}

/**
 * Format value for display
 */
function fmtVal(val: string | undefined, placeholder: string = 'not set'): string {
    return val ? chalk.green(val) : chalk.gray(placeholder);
}

/**
 * Format API key (masked)
 */
function fmtKey(val: string | undefined): string {
    if (!val) return chalk.red('not set');
    if (val.length > 10) return chalk.green(val.substring(0, 8) + '...');
    return chalk.green('***');
}

/**
 * Main menu - unified configuration
 */
export async function mainMenuV2(): Promise<void> {
    while (true) {
        showHeader('Main Menu');
        const config = configManager.getAll();

        // Build service status display
        const serviceChoices = SERVICES.map(s => {
            if (s.key === 'execution') {
                const engine = config['EXECUTION_ENGINE'] || 'not set';
                const engineLabel = engine === 'python-bridge' ? 'Python Bridge' :
                    engine === 'native' ? 'Native (MCP)' : engine;
                return {
                    name: `${s.label.padEnd(12)} ${chalk.cyan(engineLabel)}`,
                    value: `service:${s.key}`
                };
            }
            const provider = config[`${s.key.toUpperCase()}_PROVIDER`] || 'not set';
            const model = config[`${s.key.toUpperCase()}_MODEL`] || 'not set';
            return {
                name: `${s.label.padEnd(12)} ${chalk.gray(provider)} / ${chalk.cyan(model)}`,
                value: `service:${s.key}`
            };
        });

        const choices = [
            ...serviceChoices,
            { name: chalk.cyan('◆─────────────────────────────────────────────────◆'), value: '_sep1', disabled: true },
            { name: `${chalk.green('●')} Secrets & Keys`, value: 'secrets' },
            { name: `${chalk.green('●')} App Settings`, value: 'settings' },
            { name: `${chalk.green('●')} System Health`, value: 'health' },
            { name: `${chalk.green('●')} RAG Status & Search`, value: 'rag' },
            { name: chalk.cyan('◆─────────────────────────────────────────────────◆'), value: '_sep2', disabled: true },
            { name: `${chalk.green('●')} Run macOS Agent`, value: 'run_agent' },
            { name: `${chalk.green('●')} Test Tetyana`, value: 'test_tetyana' },
            { name: chalk.yellow('✕ Exit'), value: 'exit' }
        ];

        const action = await select('', choices);

        if (action === 'exit') {
            console.log(chalk.gray('\n  Exiting...\n'));
            process.exit(0);
        }

        if (action.startsWith('service:')) {
            const serviceName = action.replace('service:', '');
            await configureService(serviceName);
        } else if (action === 'secrets') {
            await configureSecrets();
        } else if (action === 'settings') {
            await configureAppSettings();
        } else if (action === 'health') {
            await runHealthCheck();
        } else if (action === 'rag') {
            await ragMenu();
        } else if (action === 'test_tetyana') {
            await testTetyanaMode();
        } else if (action === 'run_agent') {
            await runPythonAgent();
        }
    }
}

/**
 * Configure a specific service with unified interface
 */
async function configureService(service: string): Promise<void> {
    const serviceUpper = service.toUpperCase();
    const serviceInfo = SERVICES.find(s => s.key === service);
    const serviceName = serviceInfo?.label || service;

    // Special handling for Vision
    if (service === 'vision') {
        await configureVision();
        return;
    }

    // Special handling for Execution
    if (service === 'execution') {
        await configureExecutionEngine();
        return;
    }

    while (true) {
        showHeader(`Configure ${serviceName}`);
        console.log(chalk.gray(`  ${serviceInfo?.desc || ''}\n`));

        const config = configManager.getAll();
        const providerKey = `${serviceUpper}_PROVIDER`;
        const modelKey = `${serviceUpper}_MODEL`;
        const fallbackKey = `${serviceUpper}_FALLBACK_PROVIDER`;

        const currentProvider = config[providerKey];
        const currentModel = config[modelKey];
        const currentFallback = config[fallbackKey];

        const choices: { name: string; value: string; disabled?: boolean | string }[] = [
            { name: `Provider         ${fmtVal(currentProvider)}`, value: 'provider' },
            { name: `Model            ${fmtVal(currentModel)}`, value: 'model', disabled: !currentProvider ? 'Set provider first' : undefined },
            { name: `Fallback         ${currentFallback ? fmtVal(currentFallback) : chalk.gray('none')}`, value: 'fallback' },
            { name: '─'.repeat(45), value: '_sep', disabled: true },
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
                await selectFallback(fallbackKey, currentProvider);
                break;
        }
    }
}

/**
 * Configure Vision service
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

        const liveProvider = config['VISION_LIVE_PROVIDER'] || 'gemini';
        const onDemandProvider = config['VISION_ONDEMAND_PROVIDER'] || 'copilot';

        const choices = [
            { name: `${chalk.green('●')} Active Mode      ${modeLabel}`, value: 'mode' },
            { name: `${chalk.green('●')} Fallback Mode    ${fallbackLabel}`, value: 'fallback_mode' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep1', disabled: true },
            { name: `${chalk.green('●')} Live Stream      ${chalk.gray(liveProvider)}`, value: 'live' },
            { name: `${chalk.green('●')} On-Demand        ${chalk.gray(onDemandProvider)}`, value: 'ondemand' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep2', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
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
 * Configure a specific Vision mode
 */
async function configureVisionMode(label: string, prefix: string): Promise<void> {
    while (true) {
        showHeader(`Vision: ${label}`);

        const config = configManager.getAll();
        const providerKey = `${prefix}_PROVIDER`;
        const modelKey = `${prefix}_MODEL`;
        const fallbackKey = `${prefix}_FALLBACK_PROVIDER`;

        const currentProvider = config[providerKey];
        const currentModel = config[modelKey];
        const currentFallback = config[fallbackKey];

        const choices = [
            { name: `${chalk.green('●')} Provider         ${fmtVal(currentProvider)}`, value: 'provider' },
            { name: `${chalk.green('●')} Model            ${fmtVal(currentModel)}`, value: 'model', disabled: !currentProvider ? 'Set provider first' : undefined },
            { name: `${chalk.green('●')} Fallback         ${currentFallback ? fmtVal(currentFallback) : chalk.gray('none')}`, value: 'fallback' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
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
                await selectFallback(fallbackKey, currentProvider);
                break;
        }
    }
}

/**
 * Configure Execution Engine
 */
async function configureExecutionEngine(): Promise<void> {
    while (true) {
        showHeader('Configure Execution Engine');
        console.log(chalk.gray('  Select the agent runtime environment\n'));

        const config = configManager.getAll();
        const currentEngine = config['EXECUTION_ENGINE'] || 'native';

        const choices = [
            {
                name: `${chalk.green('●')} Engine           ${currentEngine === 'python-bridge' ? chalk.green('Python Bridge') : chalk.cyan('Native (MCP)')}`,
                value: 'engine'
            },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
        ];

        const action = await select('', choices);
        if (action === 'back') return;

        if (action === 'engine') {
            const engine = await select('Select Engine', [
                { name: `Python Bridge    ${chalk.gray('Advanced automation via Open Interpreter')}`, value: 'python-bridge' },
                { name: `Native (MCP)     ${chalk.gray('Standard Atlas MCP execution')}`, value: 'native' },
                { name: 'Back', value: 'back' }
            ]);

            if (engine !== 'back') {
                configManager.set('EXECUTION_ENGINE', engine);
                console.log(chalk.green(`\n  Execution engine set to ${engine}`));
                await new Promise(r => setTimeout(r, 800));
            }
        }
    }
}

/**
 * Configure Secrets & API Keys - SEPARATE SECTION
 */
async function configureSecrets(): Promise<void> {
    const keysList = [
        { key: 'GEMINI_API_KEY', label: 'Gemini API Key' },
        { key: 'COPILOT_API_KEY', label: 'GitHub Copilot Token' },
        { key: 'OPENAI_API_KEY', label: 'OpenAI API Key' },
        { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key' },
        { key: 'MISTRAL_API_KEY', label: 'Mistral API Key' }
    ];

    while (true) {
        showHeader('Secrets & API Keys');
        console.log(chalk.gray('  Manage authentication credentials\n'));

        const config = configManager.getAll();

        const choices: { name: string; value: string; disabled?: boolean }[] = keysList.map(k => ({
            name: `${chalk.green('●')} ${k.label.padEnd(28)} ${fmtKey(config[k.key])}`,
            value: k.key
        }));
        choices.push({ name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true });
        choices.push({ name: chalk.gray('← Back'), value: 'back' });

        const selected = await select('', choices);
        if (selected === 'back') return;

        const keyInfo = keysList.find(k => k.key === selected);
        const current = configManager.get(selected);

        // Special handling for Copilot
        if (selected === 'COPILOT_API_KEY') {
            const method = await select('Method', [
                { name: 'Enter Manually', value: 'manual' },
                { name: 'Import from GitHub CLI', value: 'gh' },
                { name: 'Cancel', value: 'cancel' }
            ]);

            if (method === 'cancel') continue;
            if (method === 'gh') {
                // TODO: Implement GitHub CLI import
                console.log(chalk.yellow('\n  GitHub CLI import not yet implemented'));
                await new Promise(r => setTimeout(r, 1500));
                continue;
            }
        }

        const value = await input(`${keyInfo?.label || selected}`, current);
        if (value && value !== current) {
            configManager.set(selected, value);
            console.log(chalk.green('\n  Saved!'));
            await new Promise(r => setTimeout(r, 800));
        }
    }
}

/**
 * Configure App Settings
 */
async function configureAppSettings(): Promise<void> {
    while (true) {
        showHeader('App Settings');
        const config = configManager.getAll();

        const language = config['APP_LANGUAGE'] || 'uk';
        const theme = config['APP_THEME'] || 'dark';
        const logLevel = config['LOG_LEVEL'] || 'info';

        const choices = [
            { name: `${chalk.green('●')} Language         ${language === 'uk' ? chalk.cyan('Українська') : chalk.gray('English')}`, value: 'APP_LANGUAGE' },
            { name: `${chalk.green('●')} Theme            ${theme === 'dark' ? chalk.magenta('Dark') : chalk.yellow('Light')}`, value: 'APP_THEME' },
            { name: `${chalk.green('●')} Log Level        ${chalk.cyan(logLevel)}`, value: 'LOG_LEVEL' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
        ];

        const action = await select('', choices);
        if (action === 'back') return;

        if (action === 'APP_LANGUAGE') {
            const lang = await select('Language', [
                { name: 'Українська', value: 'uk' },
                { name: 'English', value: 'en' },
                { name: 'Back', value: 'back' }
            ]);
            if (lang !== 'back') configManager.set('APP_LANGUAGE', lang);
        } else if (action === 'APP_THEME') {
            const t = await select('Theme', [
                { name: 'Dark', value: 'dark' },
                { name: 'Light', value: 'light' },
                { name: 'Back', value: 'back' }
            ]);
            if (t !== 'back') configManager.set('APP_THEME', t);
        } else if (action === 'LOG_LEVEL') {
            const level = await select('Log Level', [
                { name: 'Debug', value: 'debug' },
                { name: 'Info', value: 'info' },
                { name: 'Warn', value: 'warn' },
                { name: 'Error', value: 'error' },
                { name: 'Back', value: 'back' }
            ]);
            if (level !== 'back') configManager.set('LOG_LEVEL', level);
        }
    }
}

/**
 * Select provider
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
 * Select model
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
 * Select fallback provider
 */
async function selectFallback(fallbackKey: string, primaryProvider?: string): Promise<void> {
    const excludeSet = new Set([primaryProvider].filter(Boolean));
    const availableProviders = PROVIDERS.filter(p => !excludeSet.has(p));
    const choices = [
        { name: 'None', value: '' },
        ...availableProviders.map(p => ({ name: p, value: p })),
        { name: 'Back', value: 'back' }
    ];

    const selected = await select('Fallback Provider', choices);
    if (selected !== 'back') {
        configManager.set(fallbackKey, selected);
    }
}

/**
 * Select Vision mode
 */
async function selectVisionMode(modeKey: string): Promise<void> {
    const choices = [
        { name: `Live Stream      ${chalk.gray('Continuous video stream for real-time observation')}`, value: 'live' },
        { name: `On-Demand        ${chalk.gray('Screenshot after task - Copilot/GPT-4o analysis')}`, value: 'on-demand' },
        { name: 'Back', value: 'back' }
    ];

    const selected = await select('Vision Mode', choices);
    if (selected !== 'back') {
        configManager.set(modeKey, selected);
        console.log(chalk.green(`\n  Vision mode set to ${selected}`));
        await new Promise(r => setTimeout(r, 800));
    }
}

/**
 * Select Vision fallback mode
 */
async function selectVisionFallbackMode(modeKey: string, currentMode: string): Promise<void> {
    const choices = [
        { name: 'None', value: '' },
        currentMode !== 'live' ? { name: 'Live Stream', value: 'live' } : null,
        currentMode !== 'on-demand' ? { name: 'On-Demand', value: 'on-demand' } : null,
        { name: 'Back', value: 'back' }
    ].filter(Boolean) as any[];

    const selected = await select('Fallback Mode', choices);
    if (selected !== 'back') {
        configManager.set(modeKey, selected);
    }
}

/**
 * Get effective API key
 */
function getEffectiveApiKey(provider: string): string {
    const config = configManager.getAll();
    const providerKeyName = PROVIDER_API_KEYS[provider];
    if (config[providerKeyName]) return config[providerKeyName];
    return config['GEMINI_API_KEY'] || '';
}

/**
 * Run health check
 */
async function runHealthCheck(): Promise<void> {
    showHeader('System Health Check');
    console.log(chalk.gray('  Checking system configuration...\n'));

    const config = configManager.getAll();
    const checks = [
        { name: 'BRAIN_PROVIDER', label: 'Brain Provider' },
        { name: 'BRAIN_MODEL', label: 'Brain Model' },
        { name: 'VISION_MODE', label: 'Vision Mode' },
        { name: 'EXECUTION_ENGINE', label: 'Execution Engine' },
        { name: 'GEMINI_API_KEY', label: 'Gemini API Key' }
    ];

    let healthy = true;
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    for (const check of checks) {
        const value = config[check.name];
        const status = value ? chalk.green('✓ OK') : chalk.red('✗ MISSING');
        console.log(`  │ ${chalk.green('●')} ${check.label.padEnd(23)} ${status}`);
        if (!value) healthy = false;
    }
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));

    console.log('');
    if (healthy) {
        console.log(chalk.green('  ✓ All critical components configured!'));
    } else {
        console.log(chalk.yellow('  ⚠ Some components need configuration'));
    }

    await new Promise(r => setTimeout(r, 2000));
}

/**
 * Test Tetyana mode
 */
async function testTetyanaMode(): Promise<void> {
    showHeader('Test Tetyana (NL Mode)');
    console.log(chalk.gray('  Testing natural language task execution\n'));
    
    const task = await input('Enter a test task', 'Open Calculator');
    console.log(chalk.gray(`\n  Testing: "${task}"\n`));
    
    try {
        const { OpenInterpreterBridge } = await import('../../modules/tetyana/open_interpreter_bridge.js');
        
        const bridge = new OpenInterpreterBridge();
        
        if (!OpenInterpreterBridge.checkEnvironment()) {
            console.log(chalk.red('  ✗ Python environment not found'));
            console.log(chalk.gray('  Please ensure mac_master_agent.py is set up'));
            await new Promise(r => setTimeout(r, 2000));
            return;
        }
        
        console.log(chalk.cyan('  ◆ Testing natural language mode...\n'));
        
        try {
            const result = await bridge.execute(task);
            console.log(chalk.green('\n  ✓ Test completed successfully\n'));
            console.log(chalk.gray('  Result:'));
            console.log(chalk.cyan('  ' + result.split('\n').join('\n  ')));
            await new Promise(r => setTimeout(r, 1500));
        } catch (error: any) {
            console.log(chalk.red(`\n  ✗ Test failed: ${error.message}\n`));
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (error: any) {
        console.log(chalk.red(`  ✗ Error: ${error.message}`));
        await new Promise(r => setTimeout(r, 2000));
    }
}

/**
 * Run Python Agent
 */
async function runPythonAgent(): Promise<void> {
    showHeader('Run macOS Automation Agent - Tetyana v12');
    console.log(chalk.gray('  Execute Python-based automation\n'));
    
    // Import and use OpenInterpreterBridge
    try {
        const { OpenInterpreterBridge } = await import('../../modules/tetyana/open_interpreter_bridge.js');
        
        if (!OpenInterpreterBridge.checkEnvironment()) {
            console.log(chalk.red('  ✗ Python environment not found'));
            console.log(chalk.gray('  ' + OpenInterpreterBridge.getVersionInfo().split('\n').join('\n  ')));
            await new Promise(r => setTimeout(r, 2000));
            return;
        }
        
        // Show available versions
        const versions = OpenInterpreterBridge.getAvailableVersions();
        const versionChoices = [
            versions.clean && { name: `${chalk.green('●')} Tetyana v12 Clean (Recommended)`, value: 'clean' },
            versions.langgraph && { name: `${chalk.green('●')} Tetyana v12 + LangGraph (Extended)`, value: 'langgraph' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
        ].filter(Boolean) as any[];
        
        const selectedVersion = await select('Select version', versionChoices);
        
        if (selectedVersion === 'back') return;
        
        const task = await input('Enter task', 'Open Finder');
        console.log(chalk.gray(`\n  Executing: "${task}"\n`));
        
        const bridge = new OpenInterpreterBridge(selectedVersion as 'clean' | 'langgraph');
        
        console.log(chalk.cyan(`  ◆ Starting Tetyana v12 ${selectedVersion === 'langgraph' ? '+ LangGraph' : 'Clean'}...\n`));
        
        try {
            const result = selectedVersion === 'langgraph'
                ? await bridge.executeLangGraph(task)
                : await bridge.executeClean(task);
            
            console.log(chalk.green('\n  ✓ Agent completed successfully\n'));
            console.log(chalk.gray('  Result:'));
            console.log(chalk.cyan('  ' + result.split('\n').join('\n  ')));
            await new Promise(r => setTimeout(r, 1500));
        } catch (error: any) {
            console.log(chalk.red(`\n  ✗ Agent failed: ${error.message}\n`));
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (error: any) {
        console.log(chalk.red(`  ✗ Error: ${error.message}`));
        await new Promise(r => setTimeout(r, 2000));
    }
}

/**
 * RAG Status and Search Menu
 */
async function ragMenu(): Promise<void> {
    while (true) {
        showHeader('RAG Status & Search');
        
        const status = await getRagIndexStatus();
        const statusText = status.indexed ? 
            chalk.green(`✓ Indexed (${status.documentCount} docs)`) : 
            chalk.red('✗ Not indexed');

        const choices = [
            { name: `${chalk.green('●')} View Status           ${statusText}`, value: 'status' },
            { name: `${chalk.green('●')} Search Repository     ${chalk.gray('Find documents')}`, value: 'search' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
        ];

        const action = await select('', choices);
        
        if (action === 'back') return;
        
        if (action === 'status') {
            await displayRagStatus();
        } else if (action === 'search') {
            const query = await input('Search query', 'open Safari');
            if (query) {
                await displayRagSearch(query);
            }
        }
    }
}
