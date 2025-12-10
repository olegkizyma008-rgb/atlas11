#!/usr/bin/env node
import { mainMenuV2 } from './ui/menu-v2.js';
import { OpenInterpreterBridge } from '../modules/tetyana/open_interpreter_bridge.js';

async function main() {
    try {
        // Check if command line arguments are provided for direct task execution
        const args = process.argv.slice(2);
        
        // Check for version info flag
        const versionFlag = args.find(arg => arg === '--version-info');
        const taskArgs = args.filter(arg => !arg.startsWith('--'));
        
        if (versionFlag === '--version-info') {
            console.log('\n' + OpenInterpreterBridge.getVersionInfo() + '\n');
            process.exit(0);
        }
        
        if (taskArgs.length > 0) {
            // Direct command mode: npm run cli "Твоє завдання"
            const task = taskArgs.join(' ');
            
            console.log(`\n🎯 Executing task: "${task}"`);
            console.log(`📦 Version: Tetyana v12 LangGraph (Production)\n`);
            
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
                console.error('❌ Python environment not found. Please ensure Tetyana v12 is set up.');
                console.error(OpenInterpreterBridge.getVersionInfo());
                process.exit(1);
            }
        } else {
            // Interactive menu mode
            await mainMenuV2();
        }
    } catch (error) {
        console.error('An error occurred:', error);
        process.exit(1);
    }
}

main();
