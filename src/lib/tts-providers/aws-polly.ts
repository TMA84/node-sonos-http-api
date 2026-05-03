import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import type { SynthesizeSpeechInput, PollyClientConfig } from '@aws-sdk/client-polly';
import fileDuration from '../helpers/file-duration.js';
import settings from '../../settings.js';

const require = createRequire(import.meta.url);
const logger: typeof import('sonos-discovery/lib/helpers/logger') = require('sonos-discovery/lib/helpers/logger');

export interface TtsResult {
  duration: number;
  uri: string;
}

interface PollySynthesizeParams {
  OutputFormat: string;
  VoiceId: string;
  TextType: string;
  Text?: string;
  Engine?: string;
}

const DEFAULT_SETTINGS: PollySynthesizeParams = {
  OutputFormat: 'mp3',
  VoiceId: 'Joanna',
  TextType: 'text'
};

function polly(phrase: string, voiceName?: string): Promise<TtsResult | undefined> {
  if (!settings.aws) {
    return Promise.resolve(undefined);
  }

  // Construct a filesystem neutral filename
  const dynamicParameters = { Text: phrase };
  const synthesizeParameters: PollySynthesizeParams = Object.assign({}, DEFAULT_SETTINGS, dynamicParameters);
  if (settings.aws.name) {
    synthesizeParameters.VoiceId = settings.aws.name;
  }
  if (voiceName) {
    synthesizeParameters.VoiceId = voiceName;
  }
  if (synthesizeParameters.VoiceId.endsWith('Neural')) {
    synthesizeParameters.Engine = 'neural';
    synthesizeParameters.VoiceId = synthesizeParameters.VoiceId.slice(0, -6);
  }

  const phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
  const filename = `polly-${phraseHash}-${synthesizeParameters.VoiceId}.mp3`;
  const filepath = path.resolve(settings.webroot, 'tts', filename);

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

  const client = new PollyClient({
    region: settings.aws.region ?? 'us-east-1',
    credentials: settings.aws.credentials as PollyClientConfig['credentials'],
  });

  const command = new SynthesizeSpeechCommand(synthesizeParameters as unknown as SynthesizeSpeechInput);

  return client.send(command)
    .then(async (response) => {
      // In AWS SDK v3, AudioStream is a Readable stream (or Blob in browser).
      // Convert it to a Buffer for writing to the filesystem.
      const audioStream = response.AudioStream;
      let audioBuffer: Buffer;
      if (Buffer.isBuffer(audioStream)) {
        audioBuffer = audioStream;
      } else if (audioStream && typeof (audioStream as any).transformToByteArray === 'function') {
        // SDK v3 returns a stream with transformToByteArray helper
        const byteArray = await (audioStream as any).transformToByteArray();
        audioBuffer = Buffer.from(byteArray);
      } else if (audioStream && typeof (audioStream as any)[Symbol.asyncIterator] === 'function') {
        // Fallback: collect chunks from async iterable stream
        const chunks: Buffer[] = [];
        for await (const chunk of audioStream as any) {
          chunks.push(chunk as Buffer);
        }
        audioBuffer = Buffer.concat(chunks);
      } else {
        audioBuffer = audioStream as unknown as Buffer;
      }

      fs.writeFileSync(filepath, audioBuffer);
      return fileDuration(filepath);
    })
    .then((duration) => {
      return {
        duration,
        uri: expectedUri
      };
    });
}

export default polly;
