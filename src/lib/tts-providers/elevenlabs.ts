import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ElevenLabs from 'elevenlabs-node';
import fileDuration from '../helpers/file-duration.js';
import settings from '../../settings.js';
import type { TtsResult } from './aws-polly.js';

const require = createRequire(import.meta.url);
const logger: typeof import('sonos-discovery/lib/helpers/logger') = require('sonos-discovery/lib/helpers/logger');

interface ElevenLabsSynthesizeParams {
  textInput: string;
  voiceId?: string;
  stability: number;
  similarityBoost: number;
  speakerBoost: boolean;
  style: number;
  modelId: string;
  fileName?: string;
}

const DEFAULT_SETTINGS: Omit<ElevenLabsSynthesizeParams, 'textInput'> = {
  stability: 0.5,
  similarityBoost: 0.5,
  speakerBoost: true,
  style: 1,
  modelId: "eleven_multilingual_v2"
};

// Provider developed based on structure from aws-polly.js.
// In this tts provider language argument from uri is used to inject custom voiceId
function eleven(phrase: string, voiceId?: string): Promise<TtsResult | undefined> {
  if (!(settings as any).elevenlabs) {
    return Promise.resolve(undefined);
  }

  const elevenlabsSettings = (settings as any).elevenlabs as {
    config?: Partial<ElevenLabsSynthesizeParams>;
    auth: { apiKey: string };
  };

  // Construct a filesystem neutral filename
  const dynamicParameters: Pick<ElevenLabsSynthesizeParams, 'textInput'> = { textInput: phrase };
  const synthesizeParameters: ElevenLabsSynthesizeParams = Object.assign(
    {},
    DEFAULT_SETTINGS,
    dynamicParameters,
    elevenlabsSettings.config
  );

  if (voiceId) {
    synthesizeParameters.voiceId = voiceId;
  }

  if (!synthesizeParameters.voiceId) {
    console.log('Voice ID not found neither in settings.elevenlabs.config nor in request!');
    return Promise.resolve(undefined);
  }

  const phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
  const filename = `elevenlabs-${phraseHash}-${synthesizeParameters.voiceId}.mp3`;
  const filepath = path.resolve(settings.webroot, 'tts', filename);

  synthesizeParameters.fileName = filepath;

  const expectedUri = `/tts/${filename}`;
  try {
    fs.accessSync(filepath, fs.constants.R_OK);
    return fileDuration(filepath)
      .then((duration) => {
        return {
          duration,
          uri: expectedUri
        };
      });
  } catch (err) {
    logger.info(`announce file for phrase "${phrase}" does not seem to exist, downloading`);
  }

  const voice = new ElevenLabs({
    apiKey: elevenlabsSettings.auth.apiKey
  });

  return voice.textToSpeech(synthesizeParameters)
    .then(() => {
      console.log('Elevenlabs TTS generated new audio file.');
    })
    .then(() => {
      return fileDuration(filepath);
    })
    .then((duration) => {
      return {
        duration,
        uri: expectedUri
      };
    });
}

export default eleven;
