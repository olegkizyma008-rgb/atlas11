import chalk from 'chalk';
import { select, input } from './prompts.js';
import { configManager } from '../managers/config-manager.js';
import { modelRegistry } from '../managers/model-registry.js';
import ora from 'ora';

export async function mainMenu() {
    while (true) {
        console.clear();
        console.log(chalk.bold.blue('╔═══════════════════════════════════════════════════╗'));
        console.log(chalk.bold.blue('║            KONTUR SYSTEM CONFIGURATOR             ║'));
        console.log(chalk.bold.blue('╚═══════════════════════════════════════════════════╝'));
        console.log('');

        const config = configManager.getAll();

        const choices = [
            { name: `🧠 Brain     ${chalk.gray(config.BRAIN_PROVIDER || 'not set')} / ${chalk.green(config.BRAIN_MODEL || 'not set')}`, value: 'brain' },
            { name: `🔊 TTS       ${chalk.gray(config.TTS_PROVIDER || 'not set')} / ${chalk.green(config.TTS_MODEL || 'not set')}`, value: 'tts' },
            { name: `🎤 STT       ${chalk.gray(config.STT_PROVIDER || 'not set')} / ${chalk.green(config.STT_MODEL || 'not set')}`, value: 'stt' },
            { name: `👁️ Vision    ${chalk.gray(config.VISION_PROVIDER || 'not set')} / ${chalk.green(config.VISION_MODEL || 'not set')}`, value: 'vision' },
            { name: `🤔 Reasoning ${chalk.gray(config.REASONING_PROVIDER || 'not set')} / ${chalk.green(config.REASONING_MODEL || 'not set')}`, value: 'reasoning' },
            { name: `🔑 API Keys`, value: 'keys' },
            { name: `🧪 Test Providers`, value: 'test' },
            { name: chalk.red('Exit'), value: 'exit' }
        ];

        const action = await select('Select configuration category:', choices);

        if (action === 'exit') {
            process.exit(0);
        }

        if (action === 'keys') {
            await configureKeys();
        } else if (action === 'test') {
            await runHealthCheck();
        } else {
            await configureService(action);
        }
    }
}

async function runHealthCheck() {
    console.clear();
    console.log(chalk.bold('🧪 System Health Check\n'));

    const config = configManager.getAll();
    const services = ['BRAIN', 'TTS', 'STT', 'VISION', 'REASONING'];

    for (const service of services) {
        const provider = config[`${service}_PROVIDER`];
        const model = config[`${service}_MODEL`];
        const apiKey = config[`${provider?.toUpperCase()}_API_KEY`];

        let status = chalk.yellow('⚠️  Not Configured');

        if (provider && model && apiKey) {
            const spinner = ora(`Testing ${service} (${provider}/${model})...`).start();
            try {
                // Mock test - in reality we would try to generate 1 token or list models
                // For configured Gemini, we can actually try fetching models as a connectivity test
                if (provider === 'gemini') {
                    // Gemini verification
                    const { GoogleGenAI } = await import('@google/genai');
                    const client = new GoogleGenAI({ apiKey });
                    await client.models.list(); // Simple call to check key
                    status = chalk.green('✅  OK');
                } else if (provider === 'copilot') {
                    // Copilot verification
                    const { VSCodeCopilotProvider } = await import('../../kontur/providers/copilot.js');
                    const cp = new VSCodeCopilotProvider(apiKey);
                    const models = await cp.fetchModels(); // This triggers the token verification
                    if (models.length > 0) {
                        status = chalk.green('✅  OK (GitHub User Verified)');
                    } else {
                        throw new Error('Verification failed (Invalid token)');
                    }
                } else {
                    // For others, try fetching models via registry (it might wrap them but better than nothing)
                    // Actually, let's just mark others as "Configured" for now to avoid complexity without specific clients
                    status = chalk.blue('ℹ️  Configured (Run task to verify)');
                }
                spinner.stop();
            } catch (e: any) {
                spinner.stop();
                status = chalk.red(`❌  Failed: ${e.message}`);
            }
        }

        console.log(`${chalk.bold(service.padEnd(10))} ${status}`);
    }

    console.log('\nPress Enter to return...');
    await input('');
}

async function configureKeys() {
    const keys = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'MISTRAL_API_KEY', 'COPILOT_API_KEY'];

    while (true) {
        console.clear();
        console.log(chalk.bold('Manage API Keys'));
        const config = configManager.getAll();

        const choices = [
            ...keys.map(k => ({
                name: `${k}: ${config[k] ? chalk.green('**********') : chalk.red('Checking...')}`,
                value: k
            })),
            { name: 'Back', value: 'back' }
        ];

        const key = await select('Select key to edit:', choices);
        if (key === 'back') return;

        const currentValue = configManager.get(key);
        const newValue = await input(`Enter value for ${key}:`, currentValue);
        if (newValue) {
            configManager.set(key, newValue);
        }
    }
}

async function configureService(service: string) {
    const serviceUpper = service.toUpperCase();

    while (true) {
        console.clear();
        console.log(chalk.bold(`Configure ${serviceUpper}`));

        const config = configManager.getAll();
        const providerKey = `${serviceUpper}_PROVIDER`;
        const modelKey = `${serviceUpper}_MODEL`;

        const choices = [
            { name: `Provider: ${chalk.cyan(config[providerKey] || 'None')}`, value: 'provider' },
            { name: `Model:    ${chalk.cyan(config[modelKey] || 'None')}`, value: 'model' },
            { name: 'Back', value: 'back' }
        ];

        const action = await select('Edit:', choices);

        if (action === 'back') return;

        if (action === 'provider') {
            const providers = ['gemini', 'openai', 'anthropic', 'mistral', 'copilot'];
            const newProvider = await select('Select Provider:', providers.map(p => ({ name: p, value: p })));
            configManager.set(providerKey, newProvider);
        }

        if (action === 'model') {
            const provider = configManager.get(providerKey);
            const providerUpper = provider?.toUpperCase() || '';
            if (!provider) {
                console.log(chalk.red('Please set a provider first.'));
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            const spinner = ora('Fetching available models...').start();
            try {
                // In a real scenario, we would use the API key to fetch valid models
                // For now we use the static registry
                const models = await modelRegistry.fetchModels(provider, configManager.get(`${provider.toUpperCase()}_API_KEY`) || '');
                spinner.stop();

                const model = await select('Select Model:', models.map(m => ({ name: m.name + chalk.gray(` (${m.id})`), value: m.id })));
                configManager.set(modelKey, model);
                console.log(chalk.green(`\n✅ ${providerUpper} configured with model ${model}. Ready to initialize.`));
                await new Promise(r => setTimeout(r, 1500)); // Pause to let user see
            } catch (e) {
                spinner.fail('Failed to fetch models');
            }
        }
    }
}
