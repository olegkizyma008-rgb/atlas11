#!/usr/bin/env node
import { mainMenu } from './ui/menu.js';

async function main() {
    try {
        await mainMenu();
    } catch (error) {
        console.error('An error occurred:', error);
        process.exit(1);
    }
}

main();
