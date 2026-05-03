import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import fileDuration from '../helpers/file-duration.js';
import settings from '../../settings.js';

const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');

const DEFAULT_SETTINGS = {
  OutputFormat: 'mp3',
  VoiceId: 'Joanna',
  TextType: 'text'
};

function polly(phrase, voiceName) {
  if (!settings.aws) {
    return Promise.resolve();
  }

  // Construct a filesystem neutral filename
  const dynamicParameters = { Text: phrase };
  const synthesizeParameters = Object.assign({}, DEFAULT_SETTINGS, dynamicParameters);
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
    fs.accessSync(filepath, fs.R_OK);
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
    credentials: settings.aws.credentials,
  });

  const command = new SynthesizeSpeechCommand(synthesizeParameters);

  return client.send(command)
    .then(async (response) => {
      // In AWS SDK v3, AudioStream is a Readable stream (or Blob in browser).
      // Convert it to a Buffer for writing to the filesystem.
      const audioStream = response.AudioStream;
      let audioBuffer;
      if (Buffer.isBuffer(audioStream)) {
        audioBuffer = audioStream;
      } else if (audioStream && typeof audioStream.transformToByteArray === 'function') {
        // SDK v3 returns a stream with transformToByteArray helper
        const byteArray = await audioStream.transformToByteArray();
        audioBuffer = Buffer.from(byteArray);
      } else if (audioStream && typeof audioStream[Symbol.asyncIterator] === 'function') {
        // Fallback: collect chunks from async iterable stream
        const chunks = [];
        for await (const chunk of audioStream) {
          chunks.push(chunk);
        }
        audioBuffer = Buffer.concat(chunks);
      } else {
        audioBuffer = audioStream;
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
