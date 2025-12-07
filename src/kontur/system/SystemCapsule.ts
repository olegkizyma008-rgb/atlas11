/**
 * System Capsule - OS Integration Module
 * Handles system-level operations like opening apps and running commands
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SystemCapsule {

    constructor() {
        console.log('[SYSTEM CAPSULE] 🖥️ Initialized');
    }

    /**
     * Open an application by name
     */
    async openApp(appName: string): Promise<{ success: boolean; message: string }> {
        try {
            console.log(`[SYSTEM CAPSULE] 🚀 Opening app: ${appName}`);
            // macOS specific open command
            await execAsync(`open -a "${appName}"`);
            return { success: true, message: `Opened ${appName}` };
        } catch (error: any) {
            console.error(`[SYSTEM CAPSULE] ❌ Failed to open ${appName}:`, error.message);
            return { success: false, message: `Failed to open ${appName}: ${error.message}` };
        }
    }

    /**
     * Run a system command (Use with caution!)
     */
    async runCommand(command: string): Promise<{ success: boolean; output: string }> {
        try {
            console.log(`[SYSTEM CAPSULE] 💻 Running command: ${command}`);
            const { stdout, stderr } = await execAsync(command);
            return { success: true, output: stdout || stderr };
        } catch (error: any) {
            console.error(`[SYSTEM CAPSULE] ❌ Command failed:`, error.message);
            return { success: false, output: error.message };
        }
    }

    /**
     * Execute AppleScript
     */
    async runAppleScript(script: string): Promise<{ success: boolean; output: string }> {
        try {
            console.log(`[SYSTEM CAPSULE] 🍎 Running AppleScript`);
            const formattedScript = script.replace(/'/g, "'\"'\"'"); // Escape single quotes
            const { stdout } = await execAsync(`osascript -e '${formattedScript}'`);
            return { success: true, output: stdout.trim() };
        } catch (error: any) {
            console.error(`[SYSTEM CAPSULE] ❌ AppleScript failed:`, error.message);
            return { success: false, output: error.message };
        }
    }
}
