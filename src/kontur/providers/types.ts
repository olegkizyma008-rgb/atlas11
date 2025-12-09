/**
 * Provider Types - Multi-Provider LLM Architecture
 * Defines interfaces for all LLM/TTS/STT providers
 */

// ============ Provider Names ============
export type ProviderName =
    | 'gemini'
    | 'copilot'
    | 'mistral'
    | 'openai'
    | 'anthropic'
    | 'elevenlabs'
    | 'whisper'
    | 'web'
    | 'ukrainian'
    | 'mock';

// ============ Service Types ============
export type ServiceType = 'brain' | 'tts' | 'stt' | 'vision' | 'reasoning';

// ============ LLM Interfaces ============
export interface LLMRequest {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json';
}

export interface LLMResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model?: string;
    provider: ProviderName;
}

export interface ILLMProvider {
    readonly name: ProviderName;
    generate(request: LLMRequest): Promise<LLMResponse>;
    isAvailable(): boolean;
    getModels?(): string[] | Promise<string[]>; // Static or fast retrieval
    fetchModels?(): Promise<string[]>; // Dynamic/API retrieval
}

// ============ TTS Interfaces ============
export interface TTSRequest {
    text: string;
    voice?: string;
    language?: string;
    speed?: number;
}

export interface TTSResponse {
    audio: ArrayBuffer;
    mimeType: string;
    provider: ProviderName;
}

export interface ITTSProvider {
    readonly name: ProviderName;
    speak(request: TTSRequest): Promise<TTSResponse>;
    isAvailable(): boolean;
    getVoices?(): string[];
    speakMulti?(request: MultiSpeakerRequest): Promise<TTSResponse>;
}

export interface MultiSpeakerRequest {
    text: string;
    speakers: Array<{
        name: string;
        voice: string;
    }>;
}

// ============ STT Interfaces ============
export interface STTRequest {
    audio: string; // base64
    mimeType: string;
    language?: string;
}

export interface STTResponse {
    text: string;
    confidence?: number;
    provider: ProviderName;
}

export interface ISTTProvider {
    readonly name: ProviderName;
    transcribe(request: STTRequest): Promise<STTResponse>;
    isAvailable(): boolean;
}

// ============ Vision Interfaces ============
export type VisionMode = 'live' | 'on-demand';

export interface VisionRequest {
    image: string; // base64
    mimeType?: string; // default: image/jpeg
    prompt?: string; // optional analysis prompt
    taskContext?: string; // what task was just executed
}

export interface VisionResponse {
    analysis: string;
    anomalies: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high';
        description: string;
        location?: string;
    }>;
    confidence: number;
    verified: boolean; // did the task complete successfully?
    provider: ProviderName;
}

export interface IVisionProvider {
    readonly name: ProviderName;
    analyzeImage(request: VisionRequest): Promise<VisionResponse>;
    isAvailable(): boolean;
}

// ============ Provider Config ============
export interface ProviderConfig {
    provider: ProviderName;
    fallbackProvider?: ProviderName;
    model?: string;
    apiKey?: string;
}

// Vision has completely separate configs for Live vs On-Demand modes
export interface VisionModeConfig {
    provider: ProviderName;
    fallbackProvider?: ProviderName;
    model?: string;
    apiKey?: string;
}

export interface VisionConfig {
    mode: VisionMode; // Which mode is active
    fallbackMode?: VisionMode; // Fallback mode if primary fails (undefined = no fallback)
    live: VisionModeConfig; // Settings for Live streaming (Gemini)
    onDemand: VisionModeConfig; // Settings for On-Demand screenshots (Copilot/GPT-4o)
}

export interface ExecutionConfig {
    engine: 'python-bridge' | 'native';
}

export interface ServiceConfig {
    brain: ProviderConfig;
    tts: ProviderConfig;
    stt: ProviderConfig;
    vision: VisionConfig;
    reasoning: ProviderConfig;
    execution: ExecutionConfig;
}
