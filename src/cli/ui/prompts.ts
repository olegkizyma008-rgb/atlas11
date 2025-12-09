/**
 * KONTUR CLI - Custom Prompts
 * Clean UI without emojis, no circular navigation, no borders
 */

import {
    select as selectPrompt,
    input as inputPrompt,
    confirm as confirmPrompt,
    password as passwordPrompt
} from '@inquirer/prompts';

export interface Choice<T = string> {
    name: string;
    value: T;
    disabled?: boolean | string;
}

/**
 * Select prompt - no loop, no border, clean prefix
 */
export async function select<T = string>(
    message: string,
    choices: Choice<T>[],
    options?: { pageSize?: number }
): Promise<T> {
    // Transform choices: if disabled=true, set to empty string to hide "(disabled)" suffix
    const transformedChoices = choices.map(c => ({
        ...c,
        disabled: c.disabled === true ? '' : c.disabled
    }));

    return await selectPrompt({
        message,
        choices: transformedChoices,
        loop: false, // No circular navigation
        pageSize: options?.pageSize || 15,
        theme: {
            prefix: ''  // Remove ? prefix
        }
    });
}

/**
 * Text input prompt
 */
export async function input(
    message: string,
    defaultValue?: string,
    options?: { required?: boolean }
): Promise<string> {
    const result = await inputPrompt({
        message,
        default: defaultValue,
        validate: options?.required
            ? (val) => (val.trim() ? true : 'Value is required')
            : undefined
    });
    return result;
}

/**
 * Password/secret input prompt (masked)
 */
export async function secret(message: string, defaultValue?: string): Promise<string> {
    return await passwordPrompt({
        message,
        mask: '*'
    });
}

/**
 * Confirm prompt
 */
export async function confirm(message: string, defaultValue: boolean = false): Promise<boolean> {
    return await confirmPrompt({
        message,
        default: defaultValue
    });
}
