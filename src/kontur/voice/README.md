# Voice Capsule - Gemini TTS Module

## Overview
Voice Capsule is a TypeScript module that integrates **Gemini 2.5 Flash Preview TTS** for high-quality text-to-speech generation.

## Features
- ✅ **Single-speaker TTS** with 30 voice options
- ✅ **Multi-speaker TTS** for conversations
- ✅ **24kHz PCM audio** output
- ✅ **Ukrainian language** support (+ 23 other languages)
- ✅ **Controllable style** via natural language prompts

## Usage

### Single Speaker
```typescript
import { VoiceCapsule } from './kontur/voice/VoiceCapsule';

const voice = new VoiceCapsule();
const audioBuffer = await voice.speak('Привіт! Я ATLAS.', {
  voiceName: 'Kore' // ATLAS voice
});
```

### Multi Speaker
```typescript
const audioBuffer = await voice.speakMulti(
  'ATLAS: Привіт! TETYANA: Виконую задачу.',
  {
    speakers: [
      { name: 'ATLAS', voiceName: 'Kore' },
      { name: 'TETYANA', voiceName: 'Puck' }
    ]
  }
);
```

## Available Voices
- **Kore** - Firm (ATLAS default)
- **Puck** - Upbeat (TETYANA)
- **Fenrir** - Excitable (GRISHA)
- ... and 27 more (see [docs/TTS.md](../../docs/TTS.md))

## Integration
Voice Capsule is integrated into the KONTUR system via IPC:
1. **Frontend** (`ChatPanel.tsx`) → sends `voice:speak` IPC request
2. **Main Process** (`main/index.ts`) → calls `VoiceCapsule.speak()`
3. **Main Process** → sends `voice:audio` IPC event with audio buffer
4. **Frontend** → plays audio via Web Audio API

## Configuration
Set `GEMINI_API_KEY` in `.env`:
```bash
GEMINI_API_KEY=your_api_key_here
```

## Model
Uses `gemini-2.5-flash-preview-tts` (Preview model)

## Limitations
- Text-only input
- Audio-only output
- 32k token context window
- Requires valid Gemini API key
