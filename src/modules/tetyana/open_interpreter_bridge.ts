import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron'; // Or however we get env paths in this context if electron
import { getVisionConfig, getProviderConfig } from '../../kontur/providers/config';

// Define the path to the python venv and script
// Assuming standard posix paths for macOS as per setup
const HOME = process.env.HOME || '/Users/dev';
const PYTHON_PATH = path.join(HOME, 'mac_assistant/venv/bin/python3');
const AGENT_SCRIPT_PATH = path.join(HOME, 'mac_assistant/mac_master_agent.py');

export class OpenInterpreterBridge {
    private process: ChildProcess | null = null;
    private isRunning: boolean = false;

    /**
     * Executes a task using the Python Open Interpreter Agent.
     * @param prompt The natural language prompt/task for the agent.
     * @returns A promise that resolves when the agent completes (for single-shot tasks)
     */
    async execute(prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            console.log(`[OpenInterpreter] Starting task: ${prompt}`);

            // Gather Environment Variables
            const visionConfig = getVisionConfig();

            // Prefer OnDemand keys for high-intellect tasks usually (GPT-4o/Copilot) or Live for local?
            // User requested leveraging existing keys.
            // We'll pass all we have.

            const env = {
                ...process.env,
                GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
                COPILOT_API_KEY: process.env.COPILOT_API_KEY || '',
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
                // Ensure Python uses unbuffered output
                PYTHONUNBUFFERED: '1'
            };

            this.process = spawn(PYTHON_PATH, [AGENT_SCRIPT_PATH, prompt], {
                env,
                cwd: HOME
            });

            let fullOutput = '';

            this.process.stdout?.on('data', (data) => {
                const output = data.toString();
                console.log(`[OpenInterpreter:STDOUT] ${output}`);
                fullOutput += output;
                // Here we could emit events to the frontend via some event bus if needed
            });

            this.process.stderr?.on('data', (data) => {
                const output = data.toString();
                console.error(`[OpenInterpreter:STDERR] ${output}`);
                // Open Interpreter often logs progress to stderr
            });

            this.process.on('close', (code) => {
                console.log(`[OpenInterpreter] Process exited with code ${code}`);
                if (code === 0) {
                    resolve(fullOutput);
                } else {
                    reject(new Error(`Open Interpreter execution failed with code ${code}`));
                }
                this.isRunning = false;
                this.process = null;
            });

            this.process.on('error', (err) => {
                console.error(`[OpenInterpreter] Failed to start process:`, err);
                reject(err);
            });

            this.isRunning = true;
        });
    }

    /**
     * Checks if the python environment seems valid
     */
    static checkEnvironment(): boolean {
        return fs.existsSync(PYTHON_PATH) && fs.existsSync(AGENT_SCRIPT_PATH);
    }
}
