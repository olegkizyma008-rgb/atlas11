import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron'; // Or however we get env paths in this context if electron
import { getVisionConfig, getProviderConfig } from '../../kontur/providers/config';
import { getGrishaVisionService } from '../../kontur/vision/GrishaVisionService';

// Define the path to the python venv and script
// Assuming standard posix paths for macOS as per setup
const HOME = process.env.HOME || '/Users/dev';
const PYTHON_PATH = path.join(HOME, 'mac_assistant/venv/bin/python3');
const AGENT_SCRIPT_PATH = path.join(HOME, 'mac_assistant/mac_master_agent.py');
const ENV_FILE_PATH = path.join(HOME, 'Documents/GitHub/atlas/.env');

// Load environment variables from .env file
function loadEnvFile(): Record<string, string> {
    const envVars: Record<string, string> = {};
    try {
        if (fs.existsSync(ENV_FILE_PATH)) {
            const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
            envContent.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    const value = valueParts.join('=').trim();
                    envVars[key.trim()] = value;
                }
            });
        }
    } catch (error) {
        console.warn(`[OpenInterpreter] Could not load .env file: ${error}`);
    }
    return envVars;
}

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

            // Load environment variables from .env file
            const envFileVars = loadEnvFile();

            // Gather Environment Variables
            const visionConfig = getVisionConfig();

            // Prefer OnDemand keys for high-intellect tasks usually (GPT-4o/Copilot) or Live for local?
            // User requested leveraging existing keys.
            // We'll pass all we have.

            const env = {
                ...process.env,
                ...envFileVars, // Load from .env file
                GEMINI_API_KEY: process.env.GEMINI_API_KEY || envFileVars['GEMINI_API_KEY'] || envFileVars['VISION_API_KEY'] || envFileVars['TTS_API_KEY'] || '',
                COPILOT_API_KEY: process.env.COPILOT_API_KEY || envFileVars['COPILOT_API_KEY'] || envFileVars['BRAIN_API_KEY'] || '',
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || envFileVars['OPENAI_API_KEY'] || '',
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
     * Executes a task with Vision Feedback Loop (v12)
     */
    async executeWithVisionFeedback(
        prompt: string,
        maxRetries: number = 3
    ): Promise<string> {
        let attempt = 0;
        let lastFeedback = "";

        while (attempt < maxRetries) {
            // Step 1: Execute via Python bridge
            const enhancedPrompt = lastFeedback
                ? `${prompt}\n\n⚠️ PREVIOUS ATTEMPT FAILED:\n${lastFeedback}\nFIX THIS.`
                : prompt;

            const result = await this.execute(enhancedPrompt);

            // Step 2: Verify via Grisha Vision
            const grishaVision = getGrishaVisionService();
            await grishaVision.pauseCapture();
            await this.delay(1000);

            const verification = await grishaVision.verifyStep(
                "custom_action",
                JSON.stringify({ prompt: enhancedPrompt }),
                "Check if the last action was executed correctly"
            );

            await grishaVision.resumeCapture();

            // Step 3: Analyze result
            if (verification?.verified && verification.confidence > 90) {
                console.log(`✅ Step verified by Grisha (confidence: ${verification.confidence})`);
                return result + `\n✅ VERIFIED: ${verification.message}`;
            }

            // Step 4: Form feedback for next attempt
            lastFeedback = `Grisha says: "${verification?.message}". Confidence: ${verification?.confidence || 0}%.`;
            attempt++;

            if (attempt < maxRetries) {
                console.log(`⚠️ Attempt ${attempt}/${maxRetries}. ${lastFeedback}`);
            }
        }

        throw new Error(`❌ Failed to execute step after ${maxRetries} attempts`);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Checks if the python environment seems valid
     */
    static checkEnvironment(): boolean {
        return fs.existsSync(PYTHON_PATH) && fs.existsSync(AGENT_SCRIPT_PATH);
    }
}
