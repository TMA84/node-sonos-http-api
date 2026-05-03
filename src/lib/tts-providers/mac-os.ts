import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { createRequire } from 'node:module';
import fileDuration from '../helpers/file-duration.js';
import settings from '../../settings.js';
import type { TtsResult } from './aws-polly.js';

const require = createRequire(import.meta.url);
const logger: typeof import('sonos-discovery/lib/helpers/logger') = require('sonos-discovery/lib/helpers/logger');

interface MacSaySettings {
  rate?: string;
  voice?: string;
}

function macSay(phrase: string, voice?: string): Promise<TtsResult | undefined> {
  if (!(settings as any).macSay) {
    return Promise.resolve(undefined);
  }

  const macSaySettings = (settings as any).macSay as MacSaySettings;

  let selectedRate = macSaySettings.rate;
  if (!selectedRate) {
    selectedRate = "default";
  }
  let selectedVoice = macSaySettings.voice;
  if (voice) {
    selectedVoice = voice;
  }

  // Construct a filesystem neutral filename
  const phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
  const filename = `macSay-${phraseHash}-${selectedRate}-${selectedVoice}.m4a`;
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

  return new Promise<string>((resolve, reject) => {
    //
    // For more information on the "say" command, type "man say" in Terminal
    // or go to
    // https://developer.apple.com/legacy/library/documentation/Darwin/Reference/ManPages/man1/say.1.html
    //
    // The list of available voices can be configured in
    // System Preferences -> Accessibility -> Speech -> System Voice
    //

    let execCommand = `say "${phrase}" -o ${filepath}`;
    if (selectedVoice && selectedRate !== "default") {
      execCommand = `say -r ${selectedRate} -v ${selectedVoice} "${phrase}" -o ${filepath}`;
    } else if (selectedVoice) {
      execCommand = `say -v ${selectedVoice} "${phrase}" -o ${filepath}`;
    } else if (selectedRate !== "default") {
      execCommand = `say -r ${selectedRate} "${phrase}" -o ${filepath}`;
    }

    exec(execCommand, function (error) {
      if (error !== null) {
        reject(error);
      } else {
        resolve(expectedUri);
      }
    });
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

export default macSay;
