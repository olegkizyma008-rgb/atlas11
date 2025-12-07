declare module 'mic' {
    interface MicOptions {
        rate?: string;
        channels?: string;
        debug?: boolean;
        exitOnSilence?: number;
        device?: string;
        fileType?: string;
        bufferSize?: number;
    }

    interface MicInstance {
        getAudioStream(): any;
        start(): void;
        stop(): void;
        pause(): void;
        resume(): void;
    }

    function mic(options?: MicOptions): MicInstance;
    export = mic;
}
