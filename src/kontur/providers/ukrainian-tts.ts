
import { ITTSProvider, TTSRequest, TTSResponse, ProviderName } from './types';
import { spawn } from 'child_process';
import path from 'path';

export class UkrainianTTSProvider implements ITTSProvider {
    name: ProviderName = 'ukrainian';

    isAvailable(): boolean {
        // Ukrainian TTS is available if python3 is in the path
        // We assume it's available and let errors surface at runtime
        return true;
    }

    async speak(request: TTSRequest): Promise<TTSResponse> {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, 'python', 'ukrainian-tts.py');

            // Get voice: from request, or per-agent env config, or default
            // Voice can be passed in request.voice as "tetiana" or agent name triggers lookup
            let voice = request.voice || 'tetiana';

            // If voice looks like an agent name, look up their configured voice
            const agentVoices: Record<string, string> = {
                'ATLAS': process.env.UKRAINIAN_VOICE_ATLAS || 'dmytro',
                'TETYANA': process.env.UKRAINIAN_VOICE_TETYANA || 'tetiana',
                'GRISHA': process.env.UKRAINIAN_VOICE_GRISHA || 'oleksa'
            };
            if (agentVoices[voice.toUpperCase()]) {
                voice = agentVoices[voice.toUpperCase()];
            }

            const pythonProcess = spawn('python3', [
                scriptPath,
                '--voice', voice
            ]);

            const audioChunks: Buffer[] = [];
            let errorData = '';

            // Send text to stdin
            pythonProcess.stdin.write(request.text);
            pythonProcess.stdin.end();

            pythonProcess.stdout.on('data', (chunk) => {
                audioChunks.push(chunk);
            });

            pythonProcess.stderr.on('data', (data) => {
                errorData += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error('[UkrainianTTS] Python script error:', errorData);
                    reject(new Error(`Ukrainian TTS failed: ${errorData}`));
                } else {
                    const audioBuffer = Buffer.concat(audioChunks);
                    // Convert Node Buffer to ArrayBuffer for compatibility
                    const arrayBuffer = audioBuffer.buffer.slice(
                        audioBuffer.byteOffset,
                        audioBuffer.byteOffset + audioBuffer.byteLength
                    );

                    resolve({
                        audio: arrayBuffer,
                        mimeType: 'audio/wav',
                        provider: 'ukrainian'
                    });
                }
            });

            pythonProcess.on('error', (err) => {
                reject(new Error(`Failed to spawn python process: ${err.message}. Make sure python3 is installed and ukrainian-tts package is installed.`));
            });
        });
    }
}
