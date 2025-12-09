#!/usr/bin/env node
import { mainMenu } from './ui/menu.js';
import { OpenInterpreterBridge } from '../modules/tetyana/open_interpreter_bridge.js';

async function main() {
    try {
        // Check if command line arguments are provided for direct task execution
        const args = process.argv.slice(2);
        
        if (args.length > 0) {
            // Direct command mode: npm run cli "Твоє завдання"
            const task = args.join(' ');
            console.log(`\n🎯 Executing task: "${task}"\n`);
            
            const bridge = new OpenInterpreterBridge();
            
            if (OpenInterpreterBridge.checkEnvironment()) {
                try {
                    const result = await bridge.execute(task);
                    console.log(`\n✅ Result:\n${result}\n`);
                    process.exit(0);
                } catch (error: any) {
                    console.error(`\n❌ Execution failed: ${error.message}\n`);
                    process.exit(1);
                }
            } else {
                console.error('❌ Python environment not found. Please ensure mac_master_agent.py is set up.');
                process.exit(1);
            }
        } else {
            // Interactive menu mode
            await mainMenu();
        }
    } catch (error) {
        console.error('An error occurred:', error);
        process.exit(1);
    }
}

main();
