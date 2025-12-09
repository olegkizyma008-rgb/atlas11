import { select as selectPrompt, input as inputPrompt, confirm as confirmPrompt } from '@inquirer/prompts';

export async function select(message: string, choices: { name: string; value: any }[]) {
    return await selectPrompt({
        message,
        choices,
    });
}

export async function input(message: string, defaultValue?: string) {
    return await inputPrompt({
        message,
        default: defaultValue,
    });
}

export async function confirm(message: string, defaultValue: boolean = false) {
    return await confirmPrompt({
        message,
        default: defaultValue,
    });
}
