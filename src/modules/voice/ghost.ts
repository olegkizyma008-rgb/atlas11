import { VoiceAPI } from './contract';

export class VoiceGhost implements VoiceAPI {
    constructor() {
        console.log("🔊 VoiceGhost Initialized");
    }

    async speak(args: { text: string; voice?: 'atlas' | 'tetyana' | 'grisha' }) {
        console.log(`🔊 VoiceGhost [${args.voice || 'atlas'}]: "${args.text}"`);
        // Simulate speech duration
        await new Promise(r => setTimeout(r, 500));
    }

    async listen(args: { timeout?: number }) {
        console.log("👂 VoiceGhost: Listening...");
        // Simulate listening delay
        await new Promise(r => setTimeout(r, 1000));

        // Simulate a random command
        const commands = [
            "Hello Atlas",
            "Run system check",
            "Create a new plan"
        ];
        const text = commands[Math.floor(Math.random() * commands.length)];

        console.log(`👂 VoiceGhost: Heard "${text}"`);
        return { text };
    }
}
