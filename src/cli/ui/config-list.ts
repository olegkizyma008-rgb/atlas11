/**
 * KONTUR CLI - Unified Configuration List Manager
 * Handles multi-select configuration with enable/disable/delete operations
 * Clean design without emojis, minimal aesthetic
 */

import chalk from 'chalk';
import { select, input, confirm } from './prompts.js';
import { configManager } from '../managers/config-manager.js';

export interface ConfigItem {
    key: string;
    label: string;
    value?: string;
    category: string;
    description?: string;
    required?: boolean;
    enabled?: boolean;
}

export interface ConfigSection {
    name: string;
    description?: string;
    items: ConfigItem[];
}

/**
 * Display configuration list with checkmarks and status
 */
export function formatConfigItem(item: ConfigItem, selected: boolean = false): string {
    const checkbox = selected ? chalk.cyan('[•]') : chalk.gray('[ ]');
    const status = item.enabled === false ? chalk.gray('(disabled)') : '';
    const value = item.value ? chalk.cyan(item.value.substring(0, 20) + (item.value.length > 20 ? '...' : '')) : chalk.gray('not set');
    
    return `${checkbox} ${item.label.padEnd(20)} ${value} ${status}`;
}

/**
 * Display a configuration section with multi-select capability
 */
export async function selectConfigItems(
    section: ConfigSection,
    allowMultiple: boolean = true
): Promise<ConfigItem[]> {
    const choices: Array<{ name: string; value: string; disabled?: string | boolean }> = section.items.map(item => ({
        name: formatConfigItem(item),
        value: item.key,
        disabled: item.required ? 'Required - cannot disable' : undefined
    }));

    choices.push({ name: '─'.repeat(50), value: '_sep', disabled: true });
    choices.push({ name: 'Back', value: 'back' });

    const selected = await select('', choices);
    
    if (selected === 'back') return [];
    if (selected === '_sep') return [];

    return section.items.filter(item => item.key === selected);
}

/**
 * Manage a single configuration item (enable/disable/edit/delete)
 */
export async function manageConfigItem(item: ConfigItem): Promise<void> {
    while (true) {
        const status = item.enabled === false ? 'disabled' : 'enabled';
        const choices = [
            { name: `Status          ${chalk.cyan(status)}`, value: 'toggle' },
            { name: `Value           ${item.value ? chalk.green(item.value) : chalk.gray('not set')}`, value: 'edit' },
            { name: '─'.repeat(40), value: '_sep', disabled: true },
            { name: 'Back', value: 'back' }
        ];

        // Only allow delete if not required
        if (!item.required) {
            choices.splice(2, 0, { name: 'Delete', value: 'delete' });
        }

        const action = await select(`Manage: ${item.label}`, choices);

        if (action === 'back') return;

        switch (action) {
            case 'toggle':
                item.enabled = item.enabled === false ? true : false;
                configManager.set(`${item.key}_ENABLED`, item.enabled ? 'true' : 'false');
                console.log(chalk.green(`\n  ${item.label} is now ${item.enabled ? 'enabled' : 'disabled'}`));
                await new Promise(r => setTimeout(r, 800));
                break;

            case 'edit':
                const newValue = await input(`${item.label}`, item.value);
                if (newValue && newValue !== item.value) {
                    item.value = newValue;
                    configManager.set(item.key, newValue);
                    console.log(chalk.green('\n  Saved!'));
                    await new Promise(r => setTimeout(r, 800));
                }
                break;

            case 'delete':
                const confirm_delete = await confirm(`Delete ${item.label}?`, false);
                if (confirm_delete) {
                    configManager.set(item.key, '');
                    item.value = undefined;
                    console.log(chalk.green(`\n  ${item.label} deleted`));
                    await new Promise(r => setTimeout(r, 800));
                    return;
                }
                break;
        }
    }
}

/**
 * Display configuration summary
 */
export function displayConfigSummary(sections: ConfigSection[]): void {
    console.log(chalk.bold('\nConfiguration Summary:\n'));
    
    for (const section of sections) {
        console.log(chalk.cyan(`${section.name}`));
        if (section.description) {
            console.log(chalk.gray(`  ${section.description}`));
        }
        
        for (const item of section.items) {
            const status = item.enabled === false ? chalk.gray('disabled') : chalk.green('enabled');
            const value = item.value ? chalk.cyan(item.value.substring(0, 30)) : chalk.gray('not set');
            console.log(`  ${item.label.padEnd(20)} ${status.padEnd(10)} ${value}`);
        }
        console.log('');
    }
}

/**
 * Load configuration items from .env file
 */
export function loadConfigItems(keys: string[]): ConfigItem[] {
    const config = configManager.getAll();
    
    return keys.map(key => {
        const enabledKey = `${key}_ENABLED`;
        const enabled = config[enabledKey] !== 'false';
        
        return {
            key,
            label: formatKeyLabel(key),
            value: config[key],
            category: getKeyCategory(key),
            enabled
        };
    });
}

/**
 * Convert config key to readable label
 */
function formatKeyLabel(key: string): string {
    return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Determine category for a config key
 */
function getKeyCategory(key: string): string {
    if (key.includes('BRAIN')) return 'Brain';
    if (key.includes('VISION')) return 'Vision';
    if (key.includes('TTS') || key.includes('STT')) return 'Voice';
    if (key.includes('REASONING')) return 'Reasoning';
    if (key.includes('EXECUTION')) return 'Execution';
    return 'General';
}
