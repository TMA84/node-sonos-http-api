import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { importDir } from './import-dir.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const providers = [];

await importDir(join(__dirname, '../tts-providers'), (provider) => {
  providers.push(provider);
});

const googleModule = await import('../tts-providers/default/google.js');
providers.push(googleModule.default);

function tryDownloadTTS(phrase, language) {
  let result;
  return providers.reduce((promise, provider) => {
    return promise.then(() => {
      if (result) return result;
      return provider(phrase, language)
        .then((_result) => {
          result = _result;
          return result;
        });
      });
  }, Promise.resolve());
}

export default tryDownloadTTS;
