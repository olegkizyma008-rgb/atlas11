import { VoiceAPI } from './contract';
import { synapse } from '../../kontur/synapse';

export class VoiceCapsule implements VoiceAPI {
    async speak(args: { text: string; voice?: 'atlas' | 'tetyana' | 'grisha' }) {
        console.log("VOICE: Requesting playback:", args.text);
        synapse.emit('voice', 'request_tts', args);
    }

    async listen(args: { timeout?: number }) {
        console.log("VOICE: Requesting microphone...");
        synapse.emit('voice', 'request_stt', args);
        // In a real implementation, we would wait for a response signal here.
        // For now, we return a placeholder or wait for a mock interaction if we were fully async.
        return { text: "Real voice waiting for UI implementation" };
    }
}
