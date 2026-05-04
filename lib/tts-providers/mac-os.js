import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import fileDuration from '../helpers/file-duration.js';
import settings from '../../settings.js';

const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');

function macSay(phrase, voice) {
  if (!settings.macSay) {
    return Promise.resolve();
  }

  var selcetedRate = settings.macSay.rate;
  if( !selcetedRate ) {
    selcetedRate = "default";
  }
  var selectedVoice = settings.macSay.voice;
  if( voice ) {
    selectedVoice = voice;
  }

  // Construct a filesystem neutral filename
  const phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
  const filename = `macSay-${phraseHash}-${selcetedRate}-${selectedVoice}.m4a`;
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

 return new Promise((resolve, reject) => {
    //
    // For more information on the "say" command, type "man say" in Terminal
    // or go to
    // https://developer.apple.com/legacy/library/documentation/Darwin/Reference/ManPages/man1/say.1.html
    //
    // The list of available voices can be configured in
    // System Preferences -> Accessibility -> Speech -> System Voice
    //

    const args = [];
    if (selectedVoice) {
      args.push('-v', selectedVoice);
    }
    if (selcetedRate != "default") {
      args.push('-r', String(selcetedRate));
    }
    args.push(phrase, '-o', filepath);

    execFile('say', args,
      function (error, stdout, stderr) {
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
