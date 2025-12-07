> [!NOTE]
> **KONTUR Integration Context**: This document serves as the implementation reference for KONTUR's real-time communication layer ("Direct Neural Interface"). See [KONTUR Spec](../.agent/KONTUR_TECH_SPEC.md) for architectural details.

// To run this code you need to install the following dependencies:
// npm install @google/genai mime
// npm install -D @types/node
import {
  GoogleGenAI,
  LiveServerMessage,
  MediaResolution,
  Modality,
  Session,
} from '@google/genai';
import mime from 'mime';
import { writeFile } from 'fs';
const responseQueue: LiveServerMessage[] = [];
let session: Session | undefined = undefined;

async function handleTurn(): Promise<LiveServerMessage[]> {
  const turn: LiveServerMessage[] = [];
  let done = false;
  while (!done) {
    const message = await waitMessage();
    turn.push(message);
    if (message.serverContent && message.serverContent.turnComplete) {
      done = true;
    }
  }
  return turn;
}

async function waitMessage(): Promise<LiveServerMessage> {
  let done = false;
  let message: LiveServerMessage | undefined = undefined;
  while (!done) {
    message = responseQueue.shift();
    if (message) {
      handleModelTurn(message);
      done = true;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  return message!;
}

const audioParts: string[] = [];
function handleModelTurn(message: LiveServerMessage) {
  if(message.serverContent?.modelTurn?.parts) {
    const part = message.serverContent?.modelTurn?.parts?.[0];

    if(part?.fileData) {
      console.log(`File: ${part?.fileData.fileUri}`);
    }

    if (part?.inlineData) {
      const fileName = 'audio.wav';
      const inlineData = part?.inlineData;

      audioParts.push(inlineData?.data ?? '');

      const buffer = convertToWav(audioParts, inlineData.mimeType ?? '');
      saveBinaryFile(fileName, buffer);
    }

    if(part?.text) {
      console.log(part?.text);
    }
  }
}

function saveBinaryFile(fileName: string, content: Buffer) {
  writeFile(fileName, content, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file ${fileName}:`, err);
      return;
    }
    console.log(`Appending stream content to file ${fileName}.`);
  });
}

interface WavConversionOptions {
  numChannels : number,
  sampleRate: number,
  bitsPerSample: number
}

function convertToWav(rawData: string[], mimeType: string) {
  const options = parseMimeType(mimeType);
  const dataLength = rawData.reduce((a, b) => a + b.length, 0);
  const wavHeader = createWavHeader(dataLength, options);
  const buffer = Buffer.concat(rawData.map(data => Buffer.from(data, 'base64')));

  return Buffer.concat([wavHeader, buffer]);
}

function parseMimeType(mimeType : string) {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [_, format] = fileType.split('/');

  const options : Partial<WavConversionOptions> = {
    numChannels: 1,
    bitsPerSample: 16,
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate') {
      options.sampleRate = parseInt(value, 10);
    }
  }

  return options as WavConversionOptions;
}

function createWavHeader(dataLength: number, options: WavConversionOptions) {
  const {
    numChannels,
    sampleRate,
    bitsPerSample,
  } = options;

  // http://soundfile.sapp.org/doc/WaveFormat

  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);                      // ChunkID
  buffer.writeUInt32LE(36 + dataLength, 4);     // ChunkSize
  buffer.write('WAVE', 8);                      // Format
  buffer.write('fmt ', 12);                     // Subchunk1ID
  buffer.writeUInt32LE(16, 16);                 // Subchunk1Size (PCM)
  buffer.writeUInt16LE(1, 20);                  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);        // NumChannels
  buffer.writeUInt32LE(sampleRate, 24);         // SampleRate
  buffer.writeUInt32LE(byteRate, 28);           // ByteRate
  buffer.writeUInt16LE(blockAlign, 32);         // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);      // BitsPerSample
  buffer.write('data', 36);                     // Subchunk2ID
  buffer.writeUInt32LE(dataLength, 40);         // Subchunk2Size

  return buffer;
}

async function main() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const model = 'models/gemini-2.5-flash-native-audio-preview-09-2025'

  const config = {
    responseModalities: [
        Modality.AUDIO,
    ],
    mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: 'Zephyr',
        }
      }
    },
    contextWindowCompression: {
        triggerTokens: '25600',
        slidingWindow: { targetTokens: '12800' },
    },
  };

  session = await ai.live.connect({
    model,
    callbacks: {
      onopen: function () {
        console.debug('Opened');
      },
      onmessage: function (message: LiveServerMessage) {
        responseQueue.push(message);
      },
      onerror: function (e: ErrorEvent) {
        console.debug('Error:', e.message);
      },
      onclose: function (e: CloseEvent) {
        console.debug('Close:', e.reason);
      },
    },
    config
  });

  session.sendClientContent({
    turns: [
      `INSERT_INPUT_HERE`
    ]
  });

  await handleTurn();

  session.close();
}
main();




-------------------------


Get started with Live API

content_copy

The Live API enables low-latency, real-time voice and video interactions with Gemini. It processes continuous streams of audio, video, or text to deliver immediate, human-like spoken responses, creating a natural conversational experience for your users.

Live API Overview

Live API offers a comprehensive set of features such as Voice Activity Detection, tool use and function calling, session management (for managing long running conversations) and ephemeral tokens (for secure client-sided authentication).

This page gets you up and running with examples and basic code samples.

Try the Live API in Google AI Studiomic

Choose an implementation approach

When integrating with Live API, you'll need to choose one of the following implementation approaches:

Server-to-server: Your backend connects to the Live API using WebSockets. Typically, your client sends stream data (audio, video, text) to your server, which then forwards it to the Live API.
Client-to-server: Your frontend code connects directly to the Live API using WebSockets to stream data, bypassing your backend.
Note: Client-to-server generally offers better performance for streaming audio and video, since it bypasses the need to send the stream to your backend first. It's also easier to set up since you don't need to implement a proxy that sends data from your client to your server and then your server to the API. However, for production environments, in order to mitigate security risks, we recommend using ephemeral tokens instead of standard API keys.
Partner integrations

To streamline the development of real-time audio and video apps, you can use a third-party integration that supports the Gemini Live API over WebRTC or WebSockets.

Pipecat by Daily

Create a real-time AI chatbot using Gemini Live and Pipecat.
LiveKit

Use the Gemini Live API with LiveKit Agents.
Agent Development Kit (ADK)

Implement the Live API with Agent Development Kit (ADK).
Voximplant

Implement Live API with Voximplant.
Get started

Microphone stream  Audio file stream

This server-side example streams audio from the microphone and plays the returned audio. For complete end-to-end examples including a client application, see Example applications.

The input audio format should be in 16-bit PCM, 16kHz, mono format, and the received audio uses a sample rate of 24kHz.

Python
JavaScript
Install helpers for audio streaming. Additional system-level dependencies might be required (sox for Mac/Windows or ALSA for Linux). Refer to the speaker and mic docs for detailed installation steps.


npm install mic speaker
Note: Use headphones. This script uses the system default audio input and output, which often won't include echo cancellation. To prevent the model from interrupting itself, use headphones.

import { GoogleGenAI, Modality } from '@google/genai';
import mic from 'mic';
import Speaker from 'speaker';

const ai = new GoogleGenAI({});
// WARNING: Do not use API keys in client-side (browser based) applications
// Consider using Ephemeral Tokens instead
// More information at: https://ai.google.dev/gemini-api/docs/ephemeral-tokens

// --- Live API config ---
const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
const config = {
  responseModalities: [Modality.AUDIO],
  systemInstruction: "You are a helpful and friendly AI assistant.",
};

async function live() {
  const responseQueue = [];
  const audioQueue = [];
  let speaker;

  async function waitMessage() {
    while (responseQueue.length === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    return responseQueue.shift();
  }

  function createSpeaker() {
    if (speaker) {
      process.stdin.unpipe(speaker);
      speaker.end();
    }
    speaker = new Speaker({
      channels: 1,
      bitDepth: 16,
      sampleRate: 24000,
    });
    speaker.on('error', (err) => console.error('Speaker error:', err));
    process.stdin.pipe(speaker);
  }

  async function messageLoop() {
    // Puts incoming messages in the audio queue.
    while (true) {
      const message = await waitMessage();
      if (message.serverContent && message.serverContent.interrupted) {
        // Empty the queue on interruption to stop playback
        audioQueue.length = 0;
        continue;
      }
      if (message.serverContent && message.serverContent.modelTurn && message.serverContent.modelTurn.parts) {
        for (const part of message.serverContent.modelTurn.parts) {
          if (part.inlineData && part.inlineData.data) {
            audioQueue.push(Buffer.from(part.inlineData.data, 'base64'));
          }
        }
      }
    }
  }

  async function playbackLoop() {
    // Plays audio from the audio queue.
    while (true) {
      if (audioQueue.length === 0) {
        if (speaker) {
          // Destroy speaker if no more audio to avoid warnings from speaker library
          process.stdin.unpipe(speaker);
          speaker.end();
          speaker = null;
        }
        await new Promise((resolve) => setImmediate(resolve));
      } else {
        if (!speaker) createSpeaker();
        const chunk = audioQueue.shift();
        await new Promise((resolve) => {
          speaker.write(chunk, () => resolve());
        });
      }
    }
  }

  // Start loops
  messageLoop();
  playbackLoop();

  // Connect to Gemini Live API
  const session = await ai.live.connect({
    model: model,
    config: config,
    callbacks: {
      onopen: () => console.log('Connected to Gemini Live API'),
      onmessage: (message) => responseQueue.push(message),
      onerror: (e) => console.error('Error:', e.message),
      onclose: (e) => console.log('Closed:', e.reason),
    },
  });

  // Setup Microphone for input
  const micInstance = mic({
    rate: '16000',
    bitwidth: '16',
    channels: '1',
  });
  const micInputStream = micInstance.getAudioStream();

  micInputStream.on('data', (data) => {
    // API expects base64 encoded PCM data
    session.sendRealtimeInput({
      audio: {
        data: data.toString('base64'),
        mimeType: "audio/pcm;rate=16000"
      }
    });
  });

  micInputStream.on('error', (err) => {
    console.error('Microphone error:', err);
  });

  micInstance.start();
  console.log('Microphone started. Speak now...');
}

live().catch(console.error);
Example applications

Check out the following example applications that illustrate how to use Live API for end-to-end use cases:

Live audio starter app on AI Studio, using JavaScript libraries to connect to Live API and stream bidirectional audio through your microphone and speakers.
See the Partner integrations for additional examples and getting started guides.
------------------------------

https://ai.google.dev/gemini-api/docs/live?example=mic-stream