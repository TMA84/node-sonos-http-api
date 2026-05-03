/**
 * Type declarations for the elevenlabs-node package.
 * This package does not ship its own types.
 */

declare module 'elevenlabs-node' {
  interface ElevenLabsOptions {
    apiKey: string;
  }

  interface TextToSpeechParams {
    textInput: string;
    voiceId?: string;
    stability?: number;
    similarityBoost?: number;
    speakerBoost?: boolean;
    style?: number;
    modelId?: string;
    fileName?: string;
  }

  class ElevenLabs {
    constructor(options: ElevenLabsOptions);
    textToSpeech(params: TextToSpeechParams): Promise<unknown>;
  }

  export default ElevenLabs;
}
